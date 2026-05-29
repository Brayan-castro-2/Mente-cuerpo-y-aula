import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function checkAuth(request: Request): boolean {
    const authHeader = request.headers.get('Authorization');
    const securePassword = process.env.ADMIN_PASSWORD || 'admin2026';
    return authHeader === securePassword;
}

// OBTENER TODAS LAS ENCUESTAS (CON CONTADOR DE RESPUESTAS)
export async function GET(request: Request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
        }

        const result = await sql`
            SELECT e.id, e.titulo, e.descripcion, e.slug, e.activa, e.created_at, e.preguntas,
                   COUNT(r.id) as total_respuestas
            FROM encuestas e
            LEFT JOIN respuestas r ON r.encuesta_id = e.id
            GROUP BY e.id
            ORDER BY e.created_at DESC;
        `;

        return NextResponse.json({
            success: true,
            surveys: result.rows
        });
    } catch (error: any) {
        console.error("Error al obtener encuestas administrativas:", error);
        return NextResponse.json({
            success: false,
            error: "Error interno del servidor.",
            details: error.message
        }, { status: 500 });
    }
}

// CREAR NUEVA ENCUESTA DINÁMICA
export async function POST(request: Request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
        }

        const body = await request.json();
        const { titulo, descripcion, slug, preguntas } = body;

        if (!titulo || !slug || !preguntas || !Array.isArray(preguntas)) {
            return NextResponse.json({
                success: false,
                error: "Faltan rellenar campos obligatorios (Título, Enlace o Preguntas)."
            }, { status: 400 });
        }

        // Sanitizar el slug (minúsculas, eliminar caracteres no válidos para URL)
        const sanitizedSlug = slug
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-');

        // Validar si el slug ya existe
        const slugCheck = await sql`SELECT id FROM encuestas WHERE slug = ${sanitizedSlug} LIMIT 1;`;
        if (slugCheck.rows.length > 0) {
            return NextResponse.json({
                success: false,
                error: `El enlace '/survey/${sanitizedSlug}' ya se encuentra ocupado por otra encuesta. Por favor utiliza un enlace único.`
            }, { status: 400 });
        }

        const preguntasJson = JSON.stringify(preguntas);

        const insertResult = await sql`
            INSERT INTO encuestas (titulo, descripcion, slug, activa, preguntas)
            VALUES (${titulo}, ${descripcion}, ${sanitizedSlug}, true, ${preguntasJson})
            RETURNING id, titulo, slug;
        `;

        return NextResponse.json({
            success: true,
            message: "¡Nueva encuesta creada y activada con éxito!",
            survey: insertResult.rows[0]
        });

    } catch (error: any) {
        console.error("Error al registrar encuesta:", error);
        return NextResponse.json({
            success: false,
            error: "Error interno al guardar la nueva encuesta.",
            details: error.message
        }, { status: 500 });
    }
}

// MODIFICAR ESTADO DE LA ENCUESTA (ACTIVAR/DESACTIVAR O ELIMINAR)
export async function PATCH(request: Request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
        }

        const body = await request.json();
        const { id, activa, action } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: "ID de la encuesta requerido." }, { status: 400 });
        }

        // Si la acción es eliminar la encuesta
        if (action === 'delete') {
            await sql`DELETE FROM encuestas WHERE id = ${id};`;
            return NextResponse.json({
                success: true,
                message: "Encuesta eliminada exitosamente junto con todas sus respuestas asociadas."
            });
        }

        // De lo contrario, toggle activar/desactivar
        if (activa === undefined) {
            return NextResponse.json({ success: false, error: "Estado 'activa' requerido." }, { status: 400 });
        }

        await sql`UPDATE encuestas SET activa = ${activa} WHERE id = ${id};`;

        return NextResponse.json({
            success: true,
            message: activa ? "Encuesta activada exitosamente." : "Encuesta desactivada y cerrada con éxito."
        });

    } catch (error: any) {
        console.error("Error al actualizar encuesta:", error);
        return NextResponse.json({
            success: false,
            error: "Error interno al actualizar la encuesta.",
            details: error.message
        }, { status: 500 });
    }
}

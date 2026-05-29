import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Definición de opciones para cálculos del lado del servidor
const GAD7_QUESTIONS_COUNT = 7;

function calculateGAD7Score(body: any): number {
    let score = 0;
    for (let i = 0; i < GAD7_QUESTIONS_COUNT; i++) {
        const ans = body[`gad7_${i}`];
        if (ans === "Varios días") score += 1;
        if (ans === "Más de la mitad de los días") score += 2;
        if (ans === "Casi todos los días") score += 3;
    }
    return score;
}

function getGAD7Interpretation(score: number): string {
    if (score >= 0 && score <= 4) return "Ansiedad mínima";
    if (score >= 5 && score <= 9) return "Ansiedad leve";
    if (score >= 10 && score <= 14) return "Ansiedad moderada";
    if (score >= 15) return "Ansiedad severa";
    return "No determinado";
}

// Función auxiliar para auto-crear la tabla si no existe (robusto e infalible)
async function ensureTableExists() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS respuestas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                consentimiento VARCHAR(10) NOT NULL CHECK (consentimiento = 'Sí'),
                edad INTEGER NOT NULL CHECK (edad >= 10 AND edad <= 100),
                genero VARCHAR(50) NOT NULL,
                carrera VARCHAR(255) NOT NULL,
                anio_academico VARCHAR(50) NOT NULL,
                
                gad7_0 VARCHAR(100) NOT NULL,
                gad7_1 VARCHAR(100) NOT NULL,
                gad7_2 VARCHAR(100) NOT NULL,
                gad7_3 VARCHAR(100) NOT NULL,
                gad7_4 VARCHAR(100) NOT NULL,
                gad7_5 VARCHAR(100) NOT NULL,
                gad7_6 VARCHAR(100) NOT NULL,
                
                relacion_0 VARCHAR(100) NOT NULL,
                relacion_1 VARCHAR(100) NOT NULL,
                relacion_2 VARCHAR(100) NOT NULL,
                relacion_3 VARCHAR(100) NOT NULL,
                relacion_4 VARCHAR(100) NOT NULL,
                relacion_5 VARCHAR(100) NOT NULL,
                
                percepcion_0 VARCHAR(100) NOT NULL,
                percepcion_1 VARCHAR(100) NOT NULL,
                percepcion_2 VARCHAR(100) NOT NULL,
                
                apoyo_psicologico VARCHAR(100) NOT NULL,
                apoyo_institucional VARCHAR(100) NOT NULL,
                
                gad7_score INTEGER NOT NULL,
                gad7_level VARCHAR(50) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        `;
        
        // Crear índices si no existen
        await sql`CREATE INDEX IF NOT EXISTS idx_respuestas_carrera ON respuestas(carrera);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_respuestas_anio_academico ON respuestas(anio_academico);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_respuestas_gad7_level ON respuestas(gad7_level);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_respuestas_created_at ON respuestas(created_at);`;
    } catch (err) {
        console.error("Error al asegurar la existencia de la tabla respuestas:", err);
        throw err;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            consentimiento,
            edad,
            genero,
            carrera,
            anio,
            apoyo1,
            apoyo2
        } = body;

        // Validación ética: Si el consentimiento es "No", retornamos éxito pero sin guardar
        if (consentimiento === "No") {
            return NextResponse.json({
                success: true,
                message: "Formulario finalizado. Respetamos tu decisión de no participar, ningún dato fue guardado.",
                score: 0,
                level: "No participado"
            });
        }

        // Validación básica
        if (!edad || !genero || !carrera || !anio) {
            return NextResponse.json({
                success: false,
                error: "Faltan completar campos obligatorios de datos generales."
            }, { status: 400 });
        }

        // Cálculos seguros del lado del servidor
        const gad7Score = calculateGAD7Score(body);
        const gad7Level = getGAD7Interpretation(gad7Score);

        // Asegurar que la tabla existe en Postgres
        await ensureTableExists();

        // Extraer respuestas individuales
        const gad7_0 = body.gad7_0 || "";
        const gad7_1 = body.gad7_1 || "";
        const gad7_2 = body.gad7_2 || "";
        const gad7_3 = body.gad7_3 || "";
        const gad7_4 = body.gad7_4 || "";
        const gad7_5 = body.gad7_5 || "";
        const gad7_6 = body.gad7_6 || "";

        const relacion_0 = body.relacion_0 || "";
        const relacion_1 = body.relacion_1 || "";
        const relacion_2 = body.relacion_2 || "";
        const relacion_3 = body.relacion_3 || "";
        const relacion_4 = body.relacion_4 || "";
        const relacion_5 = body.relacion_5 || "";

        const percepcion_0 = body.percepcion_0 || "";
        const percepcion_1 = body.percepcion_1 || "";
        const percepcion_2 = body.percepcion_2 || "";

        // Insertar registro en la base de datos
        await sql`
            INSERT INTO respuestas (
                consentimiento,
                edad,
                genero,
                carrera,
                anio_academico,
                gad7_0, gad7_1, gad7_2, gad7_3, gad7_4, gad7_5, gad7_6,
                relacion_0, relacion_1, relacion_2, relacion_3, relacion_4, relacion_5,
                percepcion_0, percepcion_1, percepcion_2,
                apoyo_psicologico,
                apoyo_institucional,
                gad7_score,
                gad7_level
            ) VALUES (
                ${consentimiento},
                ${parseInt(edad)},
                ${genero},
                ${carrera},
                ${anio},
                ${gad7_0}, ${gad7_1}, ${gad7_2}, ${gad7_3}, ${gad7_4}, ${gad7_5}, ${gad7_6},
                ${relacion_0}, ${relacion_1}, ${relacion_2}, ${relacion_3}, ${relacion_4}, ${relacion_5},
                ${percepcion_0}, ${percepcion_1}, ${percepcion_2},
                ${apoyo1},
                ${apoyo2},
                ${gad7Score},
                ${gad7Level}
            );
        `;

        return NextResponse.json({
            success: true,
            message: "¡Respuestas guardadas exitosamente en la base de datos!",
            score: gad7Score,
            level: gad7Level
        });

    } catch (error: any) {
        console.error("Error en API de Encuesta:", error);
        
        // Mensaje amigable para el caso en el que no hayan conectado la BD en Vercel
        if (error.message && (error.message.includes("relation") || error.message.includes("ENOTFOUND") || error.message.includes("connection"))) {
            return NextResponse.json({
                success: false,
                error: "No se pudo conectar a la base de datos. Por favor, asegúrate de haber enlazado la base de datos de Vercel Postgres y configurado las variables de entorno en Vercel.",
                details: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: false,
            error: "Hubo un problema interno en el servidor al procesar la encuesta.",
            details: error.message
        }, { status: 500 });
    }
}

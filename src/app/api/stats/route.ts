import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// ENDPOINT PÚBLICO SEGURO - RETORNA SOLAMENTE ESTADÍSTICAS AGREGADAS
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug') || 'mente-cuerpo-y-aula';

        // 1. Obtener la encuesta por su slug para verificar que existe y está activa
        const surveyResult = await sql`
            SELECT id, titulo, descripcion, activa
            FROM encuestas
            WHERE slug = ${slug} LIMIT 1;
        `;

        if (surveyResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: `No se encontró la encuesta con el enlace: '${slug}'`
            }, { status: 404 });
        }

        const survey = surveyResult.rows[0];

        if (!survey.activa) {
            return NextResponse.json({
                success: false,
                error: "Los resultados de esta encuesta se encuentran temporalmente archivados o inactivos."
            }, { status: 403 });
        }

        // 2. Obtener todas las respuestas asociadas a esta encuesta
        const responsesResult = await sql`
            SELECT datos_generales, gad7_score, gad7_level
            FROM respuestas
            WHERE encuesta_id = ${survey.id};
        `;

        const responses = responsesResult.rows;

        // 3. Calcular las métricas agregadas de forma sumamente segura (anónima)
        const total = responses.length;
        let sumAge = 0;
        let validAgeCount = 0;

        const gad7Dist = {
            "Ansiedad mínima": 0,
            "Ansiedad leve": 0,
            "Ansiedad moderada": 0,
            "Ansiedad severa": 0,
            "No determinado / N/A": 0
        };

        const careerCount: Record<string, number> = {};
        const yearCount: Record<string, number> = {};

        responses.forEach((row) => {
            const dataGen = row.datos_generales || {};
            
            // Edad promedio
            const edad = parseInt(dataGen.edad);
            if (!isNaN(edad)) {
                sumAge += edad;
                validAgeCount++;
            }

            // GAD-7
            if (row.gad7_level) {
                const lvl = row.gad7_level as keyof typeof gad7Dist;
                if (gad7Dist[lvl] !== undefined) {
                    gad7Dist[lvl]++;
                } else {
                    gad7Dist["No determinado / N/A"]++;
                }
            } else {
                gad7Dist["No determinado / N/A"]++;
            }

            // Carreras
            if (dataGen.carrera) {
                const carrera = dataGen.carrera.trim();
                careerCount[carrera] = (careerCount[carrera] || 0) + 1;
            }

            // Años académicos
            if (dataGen.anio) {
                const anio = dataGen.anio.trim();
                yearCount[anio] = (yearCount[anio] || 0) + 1;
            }
        });

        const avgAge = validAgeCount > 0 ? parseFloat((sumAge / validAgeCount).toFixed(1)) : 0;

        // Ansiedad Crítica (Moderada + Severa)
        const criticalAnxietyCount = gad7Dist["Ansiedad moderada"] + gad7Dist["Ansiedad severa"];
        const criticalAnxietyPercent = total > 0 && (gad7Dist["Ansiedad mínima"] + gad7Dist["Ansiedad leve"] + gad7Dist["Ansiedad moderada"] + gad7Dist["Ansiedad severa"]) > 0
            ? parseFloat(((criticalAnxietyCount / (total - gad7Dist["No determinado / N/A"])) * 100).toFixed(1))
            : 0;

        // Top 5 carreras más comunes
        const topCareers = Object.entries(careerCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Distribución por años académicos
        const yearDist = Object.entries(yearCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.name.localeCompare(a.name));

        return NextResponse.json({
            success: true,
            survey: {
                titulo: survey.titulo,
                descripcion: survey.descripcion
            },
            metrics: {
                total,
                avgAge,
                criticalAnxietyPercent,
                gad7Dist,
                topCareers,
                yearDist
            }
        });

    } catch (error: any) {
        console.error("Error al obtener estadísticas públicas:", error);
        return NextResponse.json({
            success: false,
            error: "Error interno al calcular las métricas analíticas.",
            details: error.message
        }, { status: 500 });
    }
}

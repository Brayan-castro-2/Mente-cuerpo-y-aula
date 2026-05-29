import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function checkAuth(request: Request): boolean {
    const authHeader = request.headers.get('Authorization');
    const securePassword = process.env.ADMIN_PASSWORD || 'admin2026';
    return authHeader === securePassword;
}

// OBTENER RESPUESTAS Y ESTADÍSTICAS PARA UNA ENCUESTA ESPECÍFICA
export async function GET(request: Request) {
    try {
        if (!checkAuth(request)) {
            return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const surveyId = searchParams.get('surveyId');

        if (!surveyId) {
            return NextResponse.json({ success: false, error: "ID de la encuesta requerido." }, { status: 400 });
        }

        // Consultar respuestas
        const result = await sql`
            SELECT id, consentimiento, datos_generales, respuestas_preguntas, gad7_score, gad7_level, created_at
            FROM respuestas
            WHERE encuesta_id = ${surveyId}
            ORDER BY created_at DESC;
        `;

        const responses = result.rows;

        // --- CÁLCULO DE MÉTRICAS ANALÍTICAS DE NIVEL SUPERIOR (SILICON VALLEY) ---
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
            
            // 1. Edad Promedio
            const edad = parseInt(dataGen.edad);
            if (!isNaN(edad)) {
                sumAge += edad;
                validAgeCount++;
            }

            // 2. Distribución GAD-7 (Ansiedad)
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

            // 3. Distribución de Carreras
            if (dataGen.carrera) {
                const carrera = dataGen.carrera.trim();
                careerCount[carrera] = (careerCount[carrera] || 0) + 1;
            }

            // 4. Distribución por Año Académico
            if (dataGen.anio) {
                const anio = dataGen.anio.trim();
                yearCount[anio] = (yearCount[anio] || 0) + 1;
            }
        });

        const avgAge = validAgeCount > 0 ? parseFloat((sumAge / validAgeCount).toFixed(1)) : 0;

        // Calcular índice de Ansiedad Crítica (Moderada + Severa)
        const criticalAnxietyCount = gad7Dist["Ansiedad moderada"] + gad7Dist["Ansiedad severa"];
        const criticalAnxietyPercent = total > 0 && (gad7Dist["Ansiedad mínima"] + gad7Dist["Ansiedad leve"] + gad7Dist["Ansiedad moderada"] + gad7Dist["Ansiedad severa"]) > 0
            ? parseFloat(((criticalAnxietyCount / (total - gad7Dist["No determinado / N/A"])) * 100).toFixed(1))
            : 0;

        // Formatear Carreras más comunes
        const topCareers = Object.entries(careerCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const yearDist = Object.entries(yearCount).map(([name, count]) => ({ name, count }));

        return NextResponse.json({
            success: true,
            responses,
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
        console.error("Error al obtener respuestas del administrador:", error);
        return NextResponse.json({
            success: false,
            error: "Error interno en el servidor.",
            details: error.message
        }, { status: 500 });
    }
}

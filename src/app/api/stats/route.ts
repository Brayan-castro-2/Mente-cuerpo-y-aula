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

        const responses = (responsesResult.rows as any[]).map((row: any) => {
            const dataGen = { ...row.datos_generales };
            
            // Normalizar Carrera/Escuela
            const originalCarrera = dataGen.carrera || "";
            const cleanCarrera = originalCarrera.trim().toLowerCase();
            
            let escuela = originalCarrera;
            let titulado = dataGen.titulado || "No";
            
            const officialSchools = [
                "Escuela de Salud",
                "Escuela de Telecomunicaciones",
                "Escuela de Informática",
                "Escuela de Administración y Negocios",
                "Escuela de Ingeniería",
                "Escuela de Construcción",
                "Escuela de Diseño",
                "Escuela de Gastronomía",
                "Escuela de Recursos Naturales",
                "Escuela de Turismo"
            ];
            
            if (officialSchools.includes(originalCarrera)) {
                escuela = originalCarrera;
            } else if (originalCarrera === "Otra / No aplica" || originalCarrera === "Otro") {
                escuela = "Otro";
            } else {
                if (cleanCarrera.includes("tens") || cleanCarrera.includes("enfermer") || cleanCarrera.includes("odontolog") || cleanCarrera.includes("farmacia") || cleanCarrera.includes("nutricionista") || cleanCarrera.includes("terapia ocupacional") || cleanCarrera.includes("salud")) {
                    escuela = "Escuela de Salud";
                } else if (cleanCarrera.includes("informática") || cleanCarrera.includes("informatica") || cleanCarrera.includes("programador") || cleanCarrera.includes("tecnologías") || cleanCarrera.includes("telecomunicaci")) {
                    if (cleanCarrera.includes("telecomunicaci")) {
                        escuela = "Escuela de Telecomunicaciones";
                    } else {
                        escuela = "Escuela de Informática";
                    }
                } else if (cleanCarrera.includes("ingeniería mecánica") || cleanCarrera.includes("mecánica") || cleanCarrera.includes("electricidad") || cleanCarrera.includes("electrónica")) {
                    escuela = "Escuela de Ingeniería";
                } else if (cleanCarrera.includes("comercial") || cleanCarrera.includes("administra") || cleanCarrera.includes("finanzas") || cleanCarrera.includes("negocios")) {
                    escuela = "Escuela de Administración y Negocios";
                } else if (cleanCarrera.includes("turismo") || cleanCarrera.includes("hospitalidad") || cleanCarrera.includes("turistica") || cleanCarrera.includes("turística")) {
                    escuela = "Escuela de Turismo";
                } else if (cleanCarrera.includes("silvestres") || cleanCarrera.includes("recursos naturales") || cleanCarrera.includes("agrícola") || cleanCarrera.includes("forestal")) {
                    escuela = "Escuela de Recursos Naturales";
                } else if (cleanCarrera.includes("diseño") || cleanCarrera.includes("diseno")) {
                    escuela = "Escuela de Diseño";
                } else if (cleanCarrera.includes("gastrono") || cleanCarrera.includes("cocina")) {
                    escuela = "Escuela de Gastronomía";
                } else if (cleanCarrera.includes("construcción") || cleanCarrera.includes("construccion")) {
                    escuela = "Escuela de Construcción";
                } else {
                    escuela = "Otro";
                }
                
                const titledKeywords = [
                    "ingeniero comercial",
                    "profesor educación fisica",
                    "sales advisor",
                    "encargada",
                    "año sabatico"
                ];
                if (titledKeywords.some(keyword => cleanCarrera.includes(keyword))) {
                    titulado = "Sí";
                }
            }
            
            let anio = dataGen.anio;
            if (titulado === "Sí") {
                anio = "";
            }

            return {
                ...row,
                datos_generales: {
                    ...dataGen,
                    carrera: escuela,
                    originalCarrera: originalCarrera !== escuela ? originalCarrera : undefined,
                    titulado,
                    anio
                }
            };
        });

        // 3. Calcular las métricas agregadas de forma sumamente segura (anónima)
        const total = responses.length;
        let sumAge = 0;
        let validAgeCount = 0;
        let estudiantesCount = 0;
        let tituladosCount = 0;

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
                const normalizeYearName = (y: string): string => {
                    const val = y.replace('°', '').replace(' año', '').trim();
                    if (val === '1' || val === '2' || val === '3' || val === '4') {
                        return `${val}° año`;
                    }
                    const num = parseInt(val);
                    if (!isNaN(num) && num >= 5) return `${num}° año`;
                    return 'Otro';
                };
                const anio = normalizeYearName(dataGen.anio);
                yearCount[anio] = (yearCount[anio] || 0) + 1;
            }

            // Conteo Estudiantes vs Titulados
            if (dataGen.titulado === "Sí") {
                tituladosCount++;
            } else {
                estudiantesCount++;
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
                yearDist,
                estudiantesCount,
                tituladosCount
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

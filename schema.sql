-- ====================================================================
-- PLATAFORMA OFICIAL DE ENCUESTAS: ESQUEMA MULTI-ENCUESTA
-- Compatible con Vercel Postgres / Neon PostgreSQL (JSONB)
-- ====================================================================

-- 1. Tabla de Encuestas (Define los cuestionarios disponibles)
CREATE TABLE IF NOT EXISTS encuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) DEFAULT 'General' NOT NULL, -- Categoría temática
    slug VARCHAR(255) UNIQUE NOT NULL,
    activa BOOLEAN DEFAULT TRUE NOT NULL,
    preguntas JSONB NOT NULL, -- Arreglo de preguntas dinámicas [{id, titulo, tipo, opciones, requerida}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Tabla de Respuestas (Almacena los envíos de los estudiantes)
CREATE TABLE IF NOT EXISTS respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuesta_id UUID REFERENCES encuestas(id) ON DELETE CASCADE,
    
    -- Requisito ético
    consentimiento VARCHAR(10) NOT NULL CHECK (consentimiento = 'Sí'),
    
    -- Estructuras de Datos dinámicos (JSONB)
    datos_generales JSONB NOT NULL, -- Datos demográficos: {edad, genero, carrera, anio}
    respuestas_preguntas JSONB NOT NULL, -- Respuestas del estudiante: {"p_1": "Nunca", "p_2": "Sí"}
    
    -- Resultados del cálculo (GAD-7) si aplica para análisis directo
    gad7_score INTEGER CHECK (gad7_score >= 0 AND gad7_score <= 21),
    gad7_level VARCHAR(50),
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices avanzados para búsquedas y análisis analítico ultra-rápido en JSONB
CREATE INDEX IF NOT EXISTS idx_encuestas_slug ON encuestas(slug);
CREATE INDEX IF NOT EXISTS idx_encuestas_categoria ON encuestas(categoria);
CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_id ON respuestas(encuesta_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_created_at ON respuestas(created_at);

-- Índices sobre campos internos de datos_generales (JSONB) para búsquedas directas
CREATE INDEX IF NOT EXISTS idx_respuestas_carrera ON respuestas USING btree ((datos_generales->>'carrera'));
CREATE INDEX IF NOT EXISTS idx_respuestas_anio ON respuestas USING btree ((datos_generales->>'anio'));
CREATE INDEX IF NOT EXISTS idx_respuestas_gad7_level ON respuestas (gad7_level) WHERE gad7_level IS NOT NULL;

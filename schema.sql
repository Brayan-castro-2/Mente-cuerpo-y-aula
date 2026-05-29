-- ====================================================================
-- ESQUEMA DE BASE DE DATOS PARA "MENTE, CUERPO Y AULA"
-- Compatible con Vercel Postgres / Neon PostgreSQL
-- ====================================================================

-- Crear la tabla 'respuestas' para almacenar los envíos de encuestas
CREATE TABLE IF NOT EXISTS respuestas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Consentimiento
    consentimiento VARCHAR(10) NOT NULL CHECK (consentimiento = 'Sí'),
    
    -- Datos Generales del Estudiante
    edad INTEGER NOT NULL CHECK (edad >= 10 AND edad <= 100),
    genero VARCHAR(50) NOT NULL,
    carrera VARCHAR(255) NOT NULL,
    anio_academico VARCHAR(50) NOT NULL,
    
    -- Escala GAD-7 (Ansiedad)
    -- Almacena las respuestas literales: "Nunca", "Varios días", "Más de la mitad de los días", "Casi todos los días"
    gad7_0 VARCHAR(100) NOT NULL,
    gad7_1 VARCHAR(100) NOT NULL,
    gad7_2 VARCHAR(100) NOT NULL,
    gad7_3 VARCHAR(100) NOT NULL,
    gad7_4 VARCHAR(100) NOT NULL,
    gad7_5 VARCHAR(100) NOT NULL,
    gad7_6 VARCHAR(100) NOT NULL,
    
    -- Relación entre Ansiedad, Alimentación y Bienestar
    -- Almacena las respuestas literales: "Nunca", "Rara vez", "A veces", "Frecuentemente", "Muy frecuentemente"
    relacion_0 VARCHAR(100) NOT NULL,
    relacion_1 VARCHAR(100) NOT NULL,
    relacion_2 VARCHAR(100) NOT NULL,
    relacion_3 VARCHAR(100) NOT NULL,
    relacion_4 VARCHAR(100) NOT NULL,
    relacion_5 VARCHAR(100) NOT NULL,
    
    -- Percepción sobre Salud Mental y Trastornos Alimentarios
    -- Almacena las respuestas literales: "Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"
    percepcion_0 VARCHAR(100) NOT NULL,
    percepcion_1 VARCHAR(100) NOT NULL,
    percepcion_2 VARCHAR(100) NOT NULL,
    
    -- Apoyo y Bienestar
    apoyo_psicologico VARCHAR(100) NOT NULL, -- apoyo1: "Sí", "No", "No estoy seguro/a"
    apoyo_institucional VARCHAR(100) NOT NULL, -- apoyo2: "Sí", "No", "Tal vez"
    
    -- Resultados Calculados en Servidor (Para facilitar estadísticas rápidas en Excel)
    gad7_score INTEGER NOT NULL CHECK (gad7_score >= 0 AND gad7_score <= 21),
    gad7_level VARCHAR(50) NOT NULL CHECK (gad7_level IN ('Ansiedad mínima', 'Ansiedad leve', 'Ansiedad moderada', 'Ansiedad severa')),
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices recomendados para análisis y reportería rápidos
CREATE INDEX IF NOT EXISTS idx_respuestas_carrera ON respuestas(carrera);
CREATE INDEX IF NOT EXISTS idx_respuestas_anio_academico ON respuestas(anio_academico);
CREATE INDEX IF NOT EXISTS idx_respuestas_gad7_level ON respuestas(gad7_level);
CREATE INDEX IF NOT EXISTS idx_respuestas_created_at ON respuestas(created_at);

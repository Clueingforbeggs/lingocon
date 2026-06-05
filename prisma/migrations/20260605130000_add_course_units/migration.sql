-- Course units: a section layer grouping lessons into a learning path.
CREATE TABLE "course_units" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_units_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_units_courseId_idx" ON "course_units"("courseId");
CREATE INDEX "course_units_courseId_order_idx" ON "course_units"("courseId", "order");

ALTER TABLE "course_units"
    ADD CONSTRAINT "course_units_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Link lessons to an optional unit.
ALTER TABLE "course_lessons" ADD COLUMN "unitId" TEXT;

CREATE INDEX "course_lessons_unitId_idx" ON "course_lessons"("unitId");

ALTER TABLE "course_lessons"
    ADD CONSTRAINT "course_lessons_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "course_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

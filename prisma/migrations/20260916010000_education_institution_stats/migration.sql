CREATE TABLE "education_institution_stats" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,
    "universities" INTEGER NOT NULL,
    "middle_schools" INTEGER NOT NULL,
    "high_schools" INTEGER NOT NULL,
    "vocational_high_schools" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "meb_source" TEXT NOT NULL,
    "yok_source" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_institution_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "education_institution_stats_city_key"
ON "education_institution_stats"("city");

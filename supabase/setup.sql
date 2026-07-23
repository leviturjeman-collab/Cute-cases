-- ============================================================
-- Cute Cases — Setup completo para Supabase 💖
--
-- CÓMO USARLO (no necesitas instalar nada):
--   1. En supabase.com, dentro de tu proyecto, abre "SQL Editor"
--   2. Pega TODO este archivo y pulsa "Run"
--   3. Listo: tablas + 21 iPhones + fundas + 74 elementos + usuarios demo
--
-- Es seguro ejecutarlo una sola vez sobre un proyecto vacío.
-- Usuarios creados: admin@cutecases.dev y demo@cutecases.dev
-- (contraseña: cutecases123 — cámbiala tras el primer acceso)
-- ⚠️ Las medidas de los dispositivos son de DESARROLLO: verifícalas en
--    /admin antes de vender (spec §4.1).
-- ============================================================

-- CreateTable
CREATE TABLE "DeviceModel" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'iphone',
    "nombre" TEXT NOT NULL,
    "generacion" TEXT NOT NULL,
    "anchoMm" DOUBLE PRECISION NOT NULL,
    "altoMm" DOUBLE PRECISION NOT NULL,
    "radioEsquinaMm" DOUBLE PRECISION NOT NULL,
    "cameraZone" JSONB NOT NULL,
    "asset3dUrl" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeviceModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseBase" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "fotos" JSONB NOT NULL,
    "asset3dUrl" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "destacada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CaseBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseCompatibility" (
    "caseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,

    CONSTRAINT "CaseCompatibility_pkey" PRIMARY KEY ("caseId","deviceId")
);

-- CreateTable
CREATE TABLE "CaseVariant" (
    "id" TEXT NOT NULL,
    "caseBaseId" TEXT NOT NULL,
    "colorNombre" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "foto" TEXT,
    "precioCentimos" INTEGER NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CaseVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Element" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "precioCentimos" INTEGER NOT NULL,
    "anchoMm" DOUBLE PRECISION NOT NULL,
    "altoMm" DOUBLE PRECISION NOT NULL,
    "profundidadMm" DOUBLE PRECISION,
    "assetUrl" TEXT NOT NULL,
    "hitbox" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "esNuevo" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "seasonId" TEXT,
    "letraChar" TEXT,

    CONSTRAINT "Element_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonCollection" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SeasonCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nombre" TEXT NOT NULL DEFAULT 'Mi funda',
    "deviceId" TEXT NOT NULL,
    "caseVariantId" TEXT NOT NULL,
    "elementos" JSONB NOT NULL,
    "precioTotalCache" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "shareToken" TEXT NOT NULL,
    "shareNombre" TEXT,
    "publicadoGaleria" BOOLEAN NOT NULL DEFAULT false,
    "autorVisible" BOOLEAN NOT NULL DEFAULT true,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresetDesign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioCentimos" INTEGER NOT NULL,
    "designData" JSONB NOT NULL,
    "fotos" JSONB NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PresetDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "passwordHash" TEXT,
    "provider" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'user',
    "deviceId" TEXT,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "userId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("userId","designId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "designId" TEXT,
    "presetId" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseBase_slug_key" ON "CaseBase"("slug");

-- CreateIndex
CREATE INDEX "Element_categoria_activo_idx" ON "Element"("categoria", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Design_shareToken_key" ON "Design"("shareToken");

-- CreateIndex
CREATE INDEX "Design_userId_idx" ON "Design"("userId");

-- CreateIndex
CREATE INDEX "Design_publicadoGaleria_idx" ON "Design"("publicadoGaleria");

-- CreateIndex
CREATE UNIQUE INDEX "PresetDesign_slug_key" ON "PresetDesign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Like_designId_idx" ON "Like"("designId");

-- CreateIndex
CREATE INDEX "CartItem_ownerKey_idx" ON "CartItem"("ownerKey");

-- AddForeignKey
ALTER TABLE "CaseCompatibility" ADD CONSTRAINT "CaseCompatibility_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseCompatibility" ADD CONSTRAINT "CaseCompatibility_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "DeviceModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseVariant" ADD CONSTRAINT "CaseVariant_caseBaseId_fkey" FOREIGN KEY ("caseBaseId") REFERENCES "CaseBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Element" ADD CONSTRAINT "Element_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "SeasonCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "DeviceModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_caseVariantId_fkey" FOREIGN KEY ("caseVariantId") REFERENCES "CaseVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "DeviceModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============ DATOS DEL SEED ============

INSERT INTO public."AppSetting" (key, value) VALUES ('collisionMarginMm', '0.5');
INSERT INTO public."AppSetting" (key, value) VALUES ('heroClaim', '"Tu funda, tu rollo ✨"');
INSERT INTO public."AppSetting" (key, value) VALUES ('gridDefaultOn', 'false');

INSERT INTO public."CaseBase" (id, slug, nombre, descripcion, material, fotos, "asset3dUrl", activo, destacada) VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'silicona-soft', 'Silicona Soft', 'Suave, con tacto de melocotón y protección total. La favorita de la casa 💖', 'silicona', '["/img/cases/silicona-soft-1.webp", "/img/cases/silicona-soft-2.webp", "/img/cases/silicona-soft-3.webp"]', 'procedural://case', true, true);
INSERT INTO public."CaseBase" (id, slug, nombre, descripcion, material, fotos, "asset3dUrl", activo, destacada) VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'transparente-crystal', 'Transparente Crystal', 'Deja ver tu iPhone y luce tus charms como en una vitrina ✨', 'transparente', '["/img/cases/transparente-crystal-1.webp", "/img/cases/transparente-crystal-2.webp", "/img/cases/transparente-crystal-3.webp"]', 'procedural://case', true, true);
INSERT INTO public."CaseBase" (id, slug, nombre, descripcion, material, fotos, "asset3dUrl", activo, destacada) VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'rigida-glam', 'Rígida Glam', 'Acabado brillante tipo espejo con protección extra en las esquinas.', 'rigida', '["/img/cases/rigida-glam-1.webp", "/img/cases/rigida-glam-2.webp", "/img/cases/rigida-glam-3.webp"]', 'procedural://case', true, false);

INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvj90000cwqzo13pdwwu', 'iphone', 'iPhone 13 mini', '13', 66.2, 133.5, 9, '[{"x": 5, "y": 5}, {"x": 35, "y": 5}, {"x": 35, "y": 35}, {"x": 5, "y": 35}]', 'procedural://case', true, 1);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjh0001cwqzrz553ei7', 'iphone', 'iPhone 13', '13', 73.5, 148.7, 9, '[{"x": 5, "y": 5}, {"x": 37, "y": 5}, {"x": 37, "y": 37}, {"x": 5, "y": 37}]', 'procedural://case', true, 2);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjj0002cwqzams49dna', 'iphone', 'iPhone 13 Pro', '13', 73.5, 148.7, 9, '[{"x": 5, "y": 5}, {"x": 42, "y": 5}, {"x": 42, "y": 42}, {"x": 5, "y": 42}]', 'procedural://case', true, 3);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjl0003cwqz4ggh64np', 'iphone', 'iPhone 13 Pro Max', '13', 80.1, 162.8, 9, '[{"x": 5, "y": 5}, {"x": 44, "y": 5}, {"x": 44, "y": 44}, {"x": 5, "y": 44}]', 'procedural://case', true, 4);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjn0004cwqzxe90lnh5', 'iphone', 'iPhone 14', '14', 73.5, 148.7, 9, '[{"x": 5, "y": 5}, {"x": 37, "y": 5}, {"x": 37, "y": 37}, {"x": 5, "y": 37}]', 'procedural://case', true, 1);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjp0005cwqz9fuilc4r', 'iphone', 'iPhone 14 Plus', '14', 80.1, 162.8, 9, '[{"x": 5, "y": 5}, {"x": 39, "y": 5}, {"x": 39, "y": 39}, {"x": 5, "y": 39}]', 'procedural://case', true, 2);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjs0006cwqz1wyylp2s', 'iphone', 'iPhone 14 Pro', '14', 73.5, 149.5, 9, '[{"x": 5, "y": 5}, {"x": 45, "y": 5}, {"x": 45, "y": 45}, {"x": 5, "y": 45}]', 'procedural://case', true, 3);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvju0007cwqziyh3yq5b', 'iphone', 'iPhone 14 Pro Max', '14', 79.6, 162.7, 9, '[{"x": 5, "y": 5}, {"x": 47, "y": 5}, {"x": 47, "y": 47}, {"x": 5, "y": 47}]', 'procedural://case', true, 4);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjw0008cwqzrmns2cp9', 'iphone', 'iPhone 15', '15', 73.6, 149.6, 10, '[{"x": 5, "y": 5}, {"x": 38, "y": 5}, {"x": 38, "y": 38}, {"x": 5, "y": 38}]', 'procedural://case', true, 1);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvjz0009cwqzaw0436o4', 'iphone', 'iPhone 15 Plus', '15', 79.8, 162.9, 10, '[{"x": 5, "y": 5}, {"x": 40, "y": 5}, {"x": 40, "y": 40}, {"x": 5, "y": 40}]', 'procedural://case', true, 2);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvk1000acwqzhmdrtmsh', 'iphone', 'iPhone 15 Pro', '15', 72.6, 148.6, 10, '[{"x": 5, "y": 5}, {"x": 45, "y": 5}, {"x": 45, "y": 45}, {"x": 5, "y": 45}]', 'procedural://case', true, 3);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvk2000bcwqzzka3kcb4', 'iphone', 'iPhone 15 Pro Max', '15', 78.7, 161.9, 10, '[{"x": 5, "y": 5}, {"x": 47, "y": 5}, {"x": 47, "y": 47}, {"x": 5, "y": 47}]', 'procedural://case', true, 4);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvk4000ccwqz57b525o9', 'iphone', 'iPhone 16', '16', 73.6, 149.6, 10, '[{"x": 5, "y": 5}, {"x": 21, "y": 5}, {"x": 21, "y": 41}, {"x": 5, "y": 41}]', 'procedural://case', true, 1);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvk6000dcwqz1blqzugz', 'iphone', 'iPhone 16 Plus', '16', 79.8, 162.9, 10, '[{"x": 5, "y": 5}, {"x": 22, "y": 5}, {"x": 22, "y": 43}, {"x": 5, "y": 43}]', 'procedural://case', true, 2);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvk8000ecwqzgb0v27n9', 'iphone', 'iPhone 16 Pro', '16', 73.5, 151.6, 10, '[{"x": 5, "y": 5}, {"x": 47, "y": 5}, {"x": 47, "y": 47}, {"x": 5, "y": 47}]', 'procedural://case', true, 3);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvkh000fcwqz3buh9pxn', 'iphone', 'iPhone 16 Pro Max', '16', 79.6, 165, 10, '[{"x": 5, "y": 5}, {"x": 49, "y": 5}, {"x": 49, "y": 49}, {"x": 5, "y": 49}]', 'procedural://case', true, 4);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvkj000gcwqzy5sebjn3', 'iphone', 'iPhone 16e', '16', 73.5, 148.7, 9, '[{"x": 5, "y": 5}, {"x": 19, "y": 5}, {"x": 19, "y": 31}, {"x": 5, "y": 31}]', 'procedural://case', true, 5);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvkk000hcwqzqj64lb50', 'iphone', 'iPhone 17', '17', 73.6, 151.6, 10, '[{"x": 5, "y": 5}, {"x": 22, "y": 5}, {"x": 22, "y": 43}, {"x": 5, "y": 43}]', 'procedural://case', true, 1);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvkm000icwqzgt8ybz7a', 'iphone', 'iPhone 17 Air', '17', 76.8, 158.2, 10, '[{"x": 5, "y": 5}, {"x": 71.8, "y": 5}, {"x": 71.8, "y": 27}, {"x": 5, "y": 27}]', 'procedural://case', true, 2);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvko000jcwqzu55zzh7s', 'iphone', 'iPhone 17 Pro', '17', 74, 152, 10, '[{"x": 5, "y": 5}, {"x": 69, "y": 5}, {"x": 69, "y": 39}, {"x": 5, "y": 39}]', 'procedural://case', true, 3);
INSERT INTO public."DeviceModel" (id, tipo, nombre, generacion, "anchoMm", "altoMm", "radioEsquinaMm", "cameraZone", "asset3dUrl", activo, orden) VALUES ('cmrxjyvkq000kcwqz8d1ygymd', 'iphone', 'iPhone 17 Pro Max', '17', 80, 165.5, 10, '[{"x": 5, "y": 5}, {"x": 75, "y": 5}, {"x": 75, "y": 41}, {"x": 5, "y": 41}]', 'procedural://case', true, 4);

INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvj90000cwqzo13pdwwu');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjh0001cwqzrz553ei7');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjj0002cwqzams49dna');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjl0003cwqz4ggh64np');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjn0004cwqzxe90lnh5');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjp0005cwqz9fuilc4r');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjs0006cwqz1wyylp2s');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvju0007cwqziyh3yq5b');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjw0008cwqzrmns2cp9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvjz0009cwqzaw0436o4');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvk1000acwqzhmdrtmsh');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvk2000bcwqzzka3kcb4');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvk4000ccwqz57b525o9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvk6000dcwqz1blqzugz');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvk8000ecwqzgb0v27n9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvkh000fcwqz3buh9pxn');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvkj000gcwqzy5sebjn3');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvkk000hcwqzqj64lb50');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvkm000icwqzgt8ybz7a');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvko000jcwqzu55zzh7s');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvkt000lcwqzqjfaf52t', 'cmrxjyvkq000kcwqz8d1ygymd');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvj90000cwqzo13pdwwu');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjh0001cwqzrz553ei7');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjj0002cwqzams49dna');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjl0003cwqz4ggh64np');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjn0004cwqzxe90lnh5');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjp0005cwqz9fuilc4r');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjs0006cwqz1wyylp2s');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvju0007cwqziyh3yq5b');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjw0008cwqzrmns2cp9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvjz0009cwqzaw0436o4');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvk1000acwqzhmdrtmsh');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvk2000bcwqzzka3kcb4');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvk4000ccwqz57b525o9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvk6000dcwqz1blqzugz');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvk8000ecwqzgb0v27n9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvkh000fcwqz3buh9pxn');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvkj000gcwqzy5sebjn3');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvkk000hcwqzqj64lb50');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvkm000icwqzgt8ybz7a');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvko000jcwqzu55zzh7s');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvl5000qcwqziybfm3uu', 'cmrxjyvkq000kcwqz8d1ygymd');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvj90000cwqzo13pdwwu');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjh0001cwqzrz553ei7');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjj0002cwqzams49dna');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjl0003cwqz4ggh64np');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjn0004cwqzxe90lnh5');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjp0005cwqz9fuilc4r');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjs0006cwqz1wyylp2s');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvju0007cwqziyh3yq5b');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjw0008cwqzrmns2cp9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvjz0009cwqzaw0436o4');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvk1000acwqzhmdrtmsh');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvk2000bcwqzzka3kcb4');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvk4000ccwqz57b525o9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvk6000dcwqz1blqzugz');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvk8000ecwqzgb0v27n9');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvkh000fcwqz3buh9pxn');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvkj000gcwqzy5sebjn3');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvkk000hcwqzqj64lb50');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvkm000icwqzgt8ybz7a');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvko000jcwqzu55zzh7s');
INSERT INTO public."CaseCompatibility" ("caseId", "deviceId") VALUES ('cmrxjyvlc000tcwqz7ml8hhgz', 'cmrxjyvkq000kcwqz8d1ygymd');

INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvku000mcwqzuavowtsi', 'cmrxjyvkt000lcwqzqjfaf52t', 'Rosa bebé', '#FFC9E3', NULL, 1990, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvku000ncwqz3d0p8n1w', 'cmrxjyvkt000lcwqzqjfaf52t', 'Fucsia', '#F5259C', NULL, 1990, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvku000ocwqzgv17hcgb', 'cmrxjyvkt000lcwqzqjfaf52t', 'Lila', '#C9A7EB', NULL, 2190, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvku000pcwqz3mhp76pp', 'cmrxjyvkt000lcwqzqjfaf52t', 'Blanco nube', '#FFF7FB', NULL, 1990, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvl6000rcwqz2ifrqjo2', 'cmrxjyvl5000qcwqziybfm3uu', 'Cristal', '#F3F3F7', NULL, 1790, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvl6000scwqzpr38pnrq', 'cmrxjyvl5000qcwqziybfm3uu', 'Cristal rosado', '#FFE4F1', NULL, 1890, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvlc000ucwqzzc4wgj3x', 'cmrxjyvlc000tcwqz7ml8hhgz', 'Rosa espejo', '#FFA1CF', NULL, 2490, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvld000vcwqz0tv341w2', 'cmrxjyvlc000tcwqz7ml8hhgz', 'Perla', '#F5EDF2', NULL, 2490, true);
INSERT INTO public."CaseVariant" (id, "caseBaseId", "colorNombre", "colorHex", foto, "precioCentimos", disponible) VALUES ('cmrxjyvld000wcwqze69m0p8q', 'cmrxjyvlc000tcwqz7ml8hhgz', 'Cereza', '#D42A5B', NULL, 2690, false);

INSERT INTO public."User" (id, email, nombre, "passwordHash", provider, rol, "deviceId", "emailVerificado", activo, "createdAt") VALUES ('cmrxjyw1p0052cwqzdzscvlf5', 'admin@cutecases.dev', 'Equipo Cute Cases', '$argon2id$v=19$m=19456,t=2,p=1$XaKyqFQfAUO78S6GczYU5A$iOzGmjoC5o7QKd1d1VmJ2J70KDAEWSrCjCh7m6UVXeM', 'credentials', 'admin', NULL, true, true, '2026-07-23 13:34:17.533');
INSERT INTO public."User" (id, email, nombre, "passwordHash", provider, rol, "deviceId", "emailVerificado", activo, "createdAt") VALUES ('cmrxjyw1w0054cwqznacbjheq', 'demo@cutecases.dev', 'Vega', '$argon2id$v=19$m=19456,t=2,p=1$XaKyqFQfAUO78S6GczYU5A$iOzGmjoC5o7QKd1d1VmJ2J70KDAEWSrCjCh7m6UVXeM', 'credentials', 'user', 'cmrxjyvk1000acwqzhmdrtmsh', true, true, '2026-07-23 13:34:17.541');

INSERT INTO public."SeasonCollection" (id, nombre, emoji, "fechaInicio", "fechaFin", activo) VALUES ('cmrxjyvlk000xcwqzg3s374d9', 'Navidad Cute', '🎄', '2026-01-01 00:00:00', '2026-12-31 23:59:59', true);

INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvlr000zcwqzt0x41xc5', 'Corazón rosa', 'charm3d', 'corazones', 250, 12, 11, 4, 'procedural://heart?color=rosa', '[{"x": 0, "y": 4.95}, {"x": -4.199999999999999, "y": 1.1}, {"x": -6, "y": -1.65}, {"x": -5.4, "y": -3.85}, {"x": -3, "y": -4.95}, {"x": -1.2, "y": -4.18}, {"x": 0, "y": -2.75}, {"x": 1.2, "y": -4.18}, {"x": 3, "y": -4.95}, {"x": 5.4, "y": -3.85}, {"x": 6, "y": -1.65}, {"x": 4.199999999999999, "y": 1.1}]', true, false, 0, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvlv0011cwqzo0preu4n', 'Corazón fucsia', 'charm3d', 'corazones', 250, 12, 11, 4, 'procedural://heart?color=fucsia', '[{"x": 0, "y": 4.95}, {"x": -4.199999999999999, "y": 1.1}, {"x": -6, "y": -1.65}, {"x": -5.4, "y": -3.85}, {"x": -3, "y": -4.95}, {"x": -1.2, "y": -4.18}, {"x": 0, "y": -2.75}, {"x": 1.2, "y": -4.18}, {"x": 3, "y": -4.95}, {"x": 5.4, "y": -3.85}, {"x": 6, "y": -1.65}, {"x": 4.199999999999999, "y": 1.1}]', true, false, 1, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvlz0013cwqzdmwfj3l2', 'Corazón rojo', 'charm3d', 'corazones', 250, 12, 11, 4, 'procedural://heart?color=rojo', '[{"x": 0, "y": 4.95}, {"x": -4.199999999999999, "y": 1.1}, {"x": -6, "y": -1.65}, {"x": -5.4, "y": -3.85}, {"x": -3, "y": -4.95}, {"x": -1.2, "y": -4.18}, {"x": 0, "y": -2.75}, {"x": 1.2, "y": -4.18}, {"x": 3, "y": -4.95}, {"x": 5.4, "y": -3.85}, {"x": 6, "y": -1.65}, {"x": 4.199999999999999, "y": 1.1}]', true, false, 2, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvm20015cwqz230u1ywm', 'Corazón perlado', 'charm3d', 'corazones', 250, 12, 11, 4, 'procedural://heart?color=perlado', '[{"x": 0, "y": 4.95}, {"x": -4.199999999999999, "y": 1.1}, {"x": -6, "y": -1.65}, {"x": -5.4, "y": -3.85}, {"x": -3, "y": -4.95}, {"x": -1.2, "y": -4.18}, {"x": 0, "y": -2.75}, {"x": 1.2, "y": -4.18}, {"x": 3, "y": -4.95}, {"x": 5.4, "y": -3.85}, {"x": 6, "y": -1.65}, {"x": 4.199999999999999, "y": 1.1}]', true, false, 3, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvm40017cwqz39il9y73', 'Corazón grande brillante', 'charm3d', 'corazones', 390, 18, 16, 5, 'procedural://heart?color=glitter', '[{"x": 0, "y": 7.2}, {"x": -6.3, "y": 1.6}, {"x": -9, "y": -2.4}, {"x": -8.1, "y": -5.6}, {"x": -4.5, "y": -7.2}, {"x": -1.8, "y": -6.08}, {"x": 0, "y": -4}, {"x": 1.8, "y": -6.08}, {"x": 4.5, "y": -7.2}, {"x": 8.1, "y": -5.6}, {"x": 9, "y": -2.4}, {"x": 6.3, "y": 1.6}]', true, true, 4, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvm60019cwqzf7z9bo43', 'Mini corazón sticker', 'plano', 'corazones', 120, 8, 7, NULL, 'procedural://heart-flat?color=rosa', '[{"x": 0, "y": 3.15}, {"x": -2.8, "y": 0.7000000000000001}, {"x": -4, "y": -1.05}, {"x": -3.6, "y": -2.45}, {"x": -2, "y": -3.15}, {"x": -0.8, "y": -2.66}, {"x": 0, "y": -1.75}, {"x": 0.8, "y": -2.66}, {"x": 2, "y": -3.15}, {"x": 3.6, "y": -2.45}, {"x": 4, "y": -1.05}, {"x": 2.8, "y": 0.7000000000000001}]', true, false, 5, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvm8001bcwqzvegzg7wz', 'Lazo rosa', 'charm3d', 'lazos', 320, 16, 10, 5, 'procedural://bow?color=rosa', '[{"x": -8, "y": -3}, {"x": -2.4, "y": -1.2}, {"x": 2.4, "y": -1.2}, {"x": 8, "y": -3}, {"x": 8, "y": 3}, {"x": 2.4, "y": 1.2}, {"x": -2.4, "y": 1.2}, {"x": -8, "y": 3}]', true, false, 0, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvma001dcwqzs88dzgol', 'Lazo blanco', 'charm3d', 'lazos', 320, 16, 10, 5, 'procedural://bow?color=blanco', '[{"x": -8, "y": -3}, {"x": -2.4, "y": -1.2}, {"x": 2.4, "y": -1.2}, {"x": 8, "y": -3}, {"x": 8, "y": 3}, {"x": 2.4, "y": 1.2}, {"x": -2.4, "y": 1.2}, {"x": -8, "y": 3}]', true, false, 1, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmc001fcwqzxxi3x0vk', 'Lazo fucsia', 'charm3d', 'lazos', 320, 16, 10, 5, 'procedural://bow?color=fucsia', '[{"x": -8, "y": -3}, {"x": -2.4, "y": -1.2}, {"x": 2.4, "y": -1.2}, {"x": 8, "y": -3}, {"x": 8, "y": 3}, {"x": 2.4, "y": 1.2}, {"x": -2.4, "y": 1.2}, {"x": -8, "y": 3}]', true, false, 2, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvme001hcwqzlyw9yarl', 'Lazo coqueta XL', 'charm3d', 'lazos', 450, 24, 15, 6, 'procedural://bow?color=coqueta', '[{"x": -12, "y": -4.5}, {"x": -3.6, "y": -1.8}, {"x": 3.6, "y": -1.8}, {"x": 12, "y": -4.5}, {"x": 12, "y": 4.5}, {"x": 3.6, "y": 1.8}, {"x": -3.6, "y": 1.8}, {"x": -12, "y": 4.5}]', true, true, 3, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmh001jcwqzhh1o7cwh', 'Flor margarita', 'charm3d', 'flores', 280, 13, 13, 4, 'procedural://flower?tipo=margarita', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 0, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmk001lcwqz70k83cuw', 'Flor rosa', 'charm3d', 'flores', 280, 13, 13, 4, 'procedural://flower?tipo=rosa', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 1, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmm001ncwqzzdnc831b', 'Flor lavanda', 'charm3d', 'flores', 280, 13, 13, 4, 'procedural://flower?tipo=lavanda', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 2, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmp001pcwqzfsx42lyj', 'Flor girasol', 'charm3d', 'flores', 280, 13, 13, 4, 'procedural://flower?tipo=girasol', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 3, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmr001rcwqz0lsfvpv7', 'Florecitas sticker', 'plano', 'flores', 150, 10, 10, NULL, 'procedural://flower-flat', '[{"x": 5, "y": 0}, {"x": 4.330127018922194, "y": 2.5}, {"x": 2.5, "y": 4.330127018922193}, {"x": 0.0000000000000003061616997868383, "y": 5}, {"x": -2.499999999999999, "y": 4.330127018922194}, {"x": -4.330127018922194, "y": 2.5}, {"x": -5, "y": 0.0000000000000006123233995736766}, {"x": -4.330127018922193, "y": -2.5}, {"x": -2.500000000000002, "y": -4.330127018922193}, {"x": -0.0000000000000009184850993605148, "y": -5}, {"x": 2.5, "y": -4.330127018922193}, {"x": 4.330127018922192, "y": -2.500000000000002}]', true, false, 4, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmt001tcwqzd5vwc8fb', 'Fruta fresa', 'charm3d', 'frutas', 300, 12, 12, 5, 'procedural://fruit?tipo=fresa', '[{"x": 6, "y": 0}, {"x": 5.196152422706632, "y": 3.0}, {"x": 3.000000000000001, "y": 5.196152422706632}, {"x": 0.0000000000000003673940397442059, "y": 6}, {"x": -2.999999999999999, "y": 5.196152422706632}, {"x": -5.196152422706632, "y": 3.0}, {"x": -6, "y": 0.0000000000000007347880794884119}, {"x": -5.196152422706632, "y": -3.000000000000001}, {"x": -3.000000000000003, "y": -5.196152422706631}, {"x": -0.000000000000001102182119232618, "y": -6}, {"x": 3.000000000000001, "y": -5.196152422706632}, {"x": 5.19615242270663, "y": -3.000000000000003}]', true, false, 0, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmv001vcwqz84bxeu08', 'Fruta cereza', 'charm3d', 'frutas', 300, 12, 12, 5, 'procedural://fruit?tipo=cereza', '[{"x": 6, "y": 0}, {"x": 5.196152422706632, "y": 3.0}, {"x": 3.000000000000001, "y": 5.196152422706632}, {"x": 0.0000000000000003673940397442059, "y": 6}, {"x": -2.999999999999999, "y": 5.196152422706632}, {"x": -5.196152422706632, "y": 3.0}, {"x": -6, "y": 0.0000000000000007347880794884119}, {"x": -5.196152422706632, "y": -3.000000000000001}, {"x": -3.000000000000003, "y": -5.196152422706631}, {"x": -0.000000000000001102182119232618, "y": -6}, {"x": 3.000000000000001, "y": -5.196152422706632}, {"x": 5.19615242270663, "y": -3.000000000000003}]', true, false, 1, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmx001xcwqz8hoo4caa', 'Fruta limón', 'charm3d', 'frutas', 300, 12, 12, 5, 'procedural://fruit?tipo=limón', '[{"x": 6, "y": 0}, {"x": 5.196152422706632, "y": 3.0}, {"x": 3.000000000000001, "y": 5.196152422706632}, {"x": 0.0000000000000003673940397442059, "y": 6}, {"x": -2.999999999999999, "y": 5.196152422706632}, {"x": -5.196152422706632, "y": 3.0}, {"x": -6, "y": 0.0000000000000007347880794884119}, {"x": -5.196152422706632, "y": -3.000000000000001}, {"x": -3.000000000000003, "y": -5.196152422706631}, {"x": -0.000000000000001102182119232618, "y": -6}, {"x": 3.000000000000001, "y": -5.196152422706632}, {"x": 5.19615242270663, "y": -3.000000000000003}]', true, false, 2, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnl002jcwqz5a1o4ajr', 'Estrella rosa', 'charm3d', 'estrellas', 260, 12, 12, 4, 'procedural://star?color=rosa', '[{"x": 0.0000000000000003673940397442059, "y": -6}, {"x": 1.587020181189678, "y": -2.184345884812358}, {"x": 5.706339097770921, "y": -1.854101966249684}, {"x": 2.567852593996915, "y": 0.834345884812358}, {"x": 3.526711513754839, "y": 4.854101966249685}, {"x": 0.0000000000000001653273178848927, "y": 2.7}, {"x": -3.526711513754838, "y": 4.854101966249685}, {"x": -2.567852593996915, "y": 0.8343458848123583}, {"x": -5.706339097770922, "y": -1.854101966249684}, {"x": -1.587020181189678, "y": -2.184345884812358}]', true, false, 2, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvmz001zcwqz392bkct1', 'Fruta sandía', 'charm3d', 'frutas', 300, 12, 12, 5, 'procedural://fruit?tipo=sandía', '[{"x": 6, "y": 0}, {"x": 5.196152422706632, "y": 3.0}, {"x": 3.000000000000001, "y": 5.196152422706632}, {"x": 0.0000000000000003673940397442059, "y": 6}, {"x": -2.999999999999999, "y": 5.196152422706632}, {"x": -5.196152422706632, "y": 3.0}, {"x": -6, "y": 0.0000000000000007347880794884119}, {"x": -5.196152422706632, "y": -3.000000000000001}, {"x": -3.000000000000003, "y": -5.196152422706631}, {"x": -0.000000000000001102182119232618, "y": -6}, {"x": 3.000000000000001, "y": -5.196152422706632}, {"x": 5.19615242270663, "y": -3.000000000000003}]', true, false, 3, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvn20021cwqz4p76cv6j', 'Fruta melocotón', 'charm3d', 'frutas', 300, 12, 12, 5, 'procedural://fruit?tipo=melocotón', '[{"x": 6, "y": 0}, {"x": 5.196152422706632, "y": 3.0}, {"x": 3.000000000000001, "y": 5.196152422706632}, {"x": 0.0000000000000003673940397442059, "y": 6}, {"x": -2.999999999999999, "y": 5.196152422706632}, {"x": -5.196152422706632, "y": 3.0}, {"x": -6, "y": 0.0000000000000007347880794884119}, {"x": -5.196152422706632, "y": -3.000000000000001}, {"x": -3.000000000000003, "y": -5.196152422706631}, {"x": -0.000000000000001102182119232618, "y": -6}, {"x": 3.000000000000001, "y": -5.196152422706632}, {"x": 5.19615242270663, "y": -3.000000000000003}]', true, false, 4, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvn40023cwqzvzni7s17', 'Animalito gatito', 'charm3d', 'animales', 350, 15, 15, 6, 'procedural://animal?tipo=gatito', '[{"x": 7.5, "y": 0}, {"x": 6.49519052838329, "y": 3.75}, {"x": 3.750000000000001, "y": 6.495190528383289}, {"x": 0.0000000000000004592425496802575, "y": 7.5}, {"x": -3.749999999999998, "y": 6.49519052838329}, {"x": -6.49519052838329, "y": 3.75}, {"x": -7.5, "y": 0.000000000000000918485099360515}, {"x": -6.495190528383289, "y": -3.750000000000001}, {"x": -3.750000000000004, "y": -6.495190528383288}, {"x": -0.000000000000001377727649040772, "y": -7.5}, {"x": 3.750000000000001, "y": -6.495190528383289}, {"x": 6.495190528383288, "y": -3.750000000000004}]', true, false, 0, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvn60025cwqze84fpgv8', 'Animalito osito', 'charm3d', 'animales', 350, 15, 15, 6, 'procedural://animal?tipo=osito', '[{"x": 7.5, "y": 0}, {"x": 6.49519052838329, "y": 3.75}, {"x": 3.750000000000001, "y": 6.495190528383289}, {"x": 0.0000000000000004592425496802575, "y": 7.5}, {"x": -3.749999999999998, "y": 6.49519052838329}, {"x": -6.49519052838329, "y": 3.75}, {"x": -7.5, "y": 0.000000000000000918485099360515}, {"x": -6.495190528383289, "y": -3.750000000000001}, {"x": -3.750000000000004, "y": -6.495190528383288}, {"x": -0.000000000000001377727649040772, "y": -7.5}, {"x": 3.750000000000001, "y": -6.495190528383289}, {"x": 6.495190528383288, "y": -3.750000000000004}]', true, false, 1, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvn80027cwqzctk5qnjd', 'Animalito conejito', 'charm3d', 'animales', 350, 15, 15, 6, 'procedural://animal?tipo=conejito', '[{"x": 7.5, "y": 0}, {"x": 6.49519052838329, "y": 3.75}, {"x": 3.750000000000001, "y": 6.495190528383289}, {"x": 0.0000000000000004592425496802575, "y": 7.5}, {"x": -3.749999999999998, "y": 6.49519052838329}, {"x": -6.49519052838329, "y": 3.75}, {"x": -7.5, "y": 0.000000000000000918485099360515}, {"x": -6.495190528383289, "y": -3.750000000000001}, {"x": -3.750000000000004, "y": -6.495190528383288}, {"x": -0.000000000000001377727649040772, "y": -7.5}, {"x": 3.750000000000001, "y": -6.495190528383289}, {"x": 6.495190528383288, "y": -3.750000000000004}]', true, false, 2, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvna0029cwqztinnmoa8', 'Animalito patito', 'charm3d', 'animales', 350, 15, 15, 6, 'procedural://animal?tipo=patito', '[{"x": 7.5, "y": 0}, {"x": 6.49519052838329, "y": 3.75}, {"x": 3.750000000000001, "y": 6.495190528383289}, {"x": 0.0000000000000004592425496802575, "y": 7.5}, {"x": -3.749999999999998, "y": 6.49519052838329}, {"x": -6.49519052838329, "y": 3.75}, {"x": -7.5, "y": 0.000000000000000918485099360515}, {"x": -6.495190528383289, "y": -3.750000000000001}, {"x": -3.750000000000004, "y": -6.495190528383288}, {"x": -0.000000000000001377727649040772, "y": -7.5}, {"x": 3.750000000000001, "y": -6.495190528383289}, {"x": 6.495190528383288, "y": -3.750000000000004}]', true, false, 3, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnc002bcwqzxxig3dl3', 'Animalito mariposa', 'charm3d', 'animales', 350, 15, 15, 6, 'procedural://animal?tipo=mariposa', '[{"x": 7.5, "y": 0}, {"x": 6.49519052838329, "y": 3.75}, {"x": 3.750000000000001, "y": 6.495190528383289}, {"x": 0.0000000000000004592425496802575, "y": 7.5}, {"x": -3.749999999999998, "y": 6.49519052838329}, {"x": -6.49519052838329, "y": 3.75}, {"x": -7.5, "y": 0.000000000000000918485099360515}, {"x": -6.495190528383289, "y": -3.750000000000001}, {"x": -3.750000000000004, "y": -6.495190528383288}, {"x": -0.000000000000001377727649040772, "y": -7.5}, {"x": 3.750000000000001, "y": -6.495190528383289}, {"x": 6.495190528383288, "y": -3.750000000000004}]', true, false, 4, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvne002dcwqzs2e91raj', 'Mariposa sticker', 'plano', 'animales', 160, 12, 10, NULL, 'procedural://butterfly-flat', '[{"x": -6, "y": -5}, {"x": 6, "y": -5}, {"x": 6, "y": 5}, {"x": -6, "y": 5}]', true, false, 5, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvng002fcwqztwbayj7m', 'Estrella dorada', 'charm3d', 'estrellas', 260, 12, 12, 4, 'procedural://star?color=dorada', '[{"x": 0.0000000000000003673940397442059, "y": -6}, {"x": 1.587020181189678, "y": -2.184345884812358}, {"x": 5.706339097770921, "y": -1.854101966249684}, {"x": 2.567852593996915, "y": 0.834345884812358}, {"x": 3.526711513754839, "y": 4.854101966249685}, {"x": 0.0000000000000001653273178848927, "y": 2.7}, {"x": -3.526711513754838, "y": 4.854101966249685}, {"x": -2.567852593996915, "y": 0.8343458848123583}, {"x": -5.706339097770922, "y": -1.854101966249684}, {"x": -1.587020181189678, "y": -2.184345884812358}]', true, false, 0, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnj002hcwqzlydcgjd3', 'Estrella plateada', 'charm3d', 'estrellas', 260, 12, 12, 4, 'procedural://star?color=plateada', '[{"x": 0.0000000000000003673940397442059, "y": -6}, {"x": 1.587020181189678, "y": -2.184345884812358}, {"x": 5.706339097770921, "y": -1.854101966249684}, {"x": 2.567852593996915, "y": 0.834345884812358}, {"x": 3.526711513754839, "y": 4.854101966249685}, {"x": 0.0000000000000001653273178848927, "y": 2.7}, {"x": -3.526711513754838, "y": 4.854101966249685}, {"x": -2.567852593996915, "y": 0.8343458848123583}, {"x": -5.706339097770922, "y": -1.854101966249684}, {"x": -1.587020181189678, "y": -2.184345884812358}]', true, false, 1, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnn002lcwqz77zler7g', 'Lluvia de estrellitas sticker', 'plano', 'estrellas', 140, 9, 9, NULL, 'procedural://star-flat', '[{"x": 0.0000000000000002755455298081545, "y": -4.5}, {"x": 1.190265135892258, "y": -1.638259413609269}, {"x": 4.279754323328191, "y": -1.390576474687263}, {"x": 1.925889445497686, "y": 0.6257594136092685}, {"x": 2.645033635316129, "y": 3.640576474687264}, {"x": 0.0000000000000001239954884136695, "y": 2.025}, {"x": -2.645033635316129, "y": 3.640576474687264}, {"x": -1.925889445497686, "y": 0.6257594136092687}, {"x": -4.279754323328191, "y": -1.390576474687263}, {"x": -1.190265135892258, "y": -1.638259413609268}]', true, false, 3, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnq002ncwqzgrd1myrb', 'Cadena dorada', 'charm3d', 'cadenas', 480, 40, 8, 4, 'procedural://chain?tipo=dorada', '[{"x": -20, "y": -4}, {"x": 20, "y": -4}, {"x": 20, "y": 4}, {"x": -20, "y": 4}]', true, false, 0, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnr002pcwqzz17w8v2u', 'Cadena plateada', 'charm3d', 'cadenas', 480, 40, 8, 4, 'procedural://chain?tipo=plateada', '[{"x": -20, "y": -4}, {"x": 20, "y": -4}, {"x": 20, "y": 4}, {"x": -20, "y": 4}]', true, false, 1, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnt002rcwqz4bzn17zj', 'Cadena perlas', 'charm3d', 'cadenas', 480, 40, 8, 4, 'procedural://chain?tipo=perlas', '[{"x": -20, "y": -4}, {"x": 20, "y": -4}, {"x": 20, "y": 4}, {"x": -20, "y": 4}]', true, false, 2, NULL, NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnv002tcwqzwvqmb4pi', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=A', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 0, NULL, 'A');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvnx002vcwqz4uhue5wz', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=B', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 1, NULL, 'B');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvo0002xcwqz3e0rt07v', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=C', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 2, NULL, 'C');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvo2002zcwqzocf7p1pg', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=D', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 3, NULL, 'D');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvo40031cwqziy744fen', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=E', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 4, NULL, 'E');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvo60033cwqzxxl4g7wb', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=F', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 5, NULL, 'F');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvo90035cwqz5hlm97xd', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=G', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 6, NULL, 'G');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvob0037cwqzlcwgyftq', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=H', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 7, NULL, 'H');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvoe0039cwqzw2e7f8fn', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=I', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 8, NULL, 'I');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvoh003bcwqztsd5xos2', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=J', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 9, NULL, 'J');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvoj003dcwqz5nd966wv', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=K', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 10, NULL, 'K');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvol003fcwqz4muccmqb', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=L', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 11, NULL, 'L');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvoo003hcwqz4daz2rpq', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=M', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 12, NULL, 'M');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvor003jcwqzjsn3e2uh', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=N', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 13, NULL, 'N');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvou003lcwqzqlvkyxak', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=%C3%91', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 14, NULL, 'Ñ');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvox003ncwqzr6h41vo5', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=O', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 15, NULL, 'O');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvoz003pcwqz2uy1e6ow', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=P', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 16, NULL, 'P');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvp3003rcwqz6qngivkh', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=Q', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 17, NULL, 'Q');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvp5003tcwqzsdr1rfuy', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=R', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 18, NULL, 'R');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvp9003vcwqzl3qjwq9k', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=S', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 19, NULL, 'S');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpb003xcwqzotxtj2a5', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=T', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 20, NULL, 'T');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpe003zcwqz03iar6k0', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=U', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 21, NULL, 'U');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpg0041cwqzra5kpnse', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=V', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 22, NULL, 'V');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpi0043cwqzo5bs9yix', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=W', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 23, NULL, 'W');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpk0045cwqzs7rlrdpm', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=X', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 24, NULL, 'X');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpn0047cwqzh7gnempn', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=Y', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 25, NULL, 'Y');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpp0049cwqzwjr5gjsh', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=Z', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 26, NULL, 'Z');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpr004bcwqzp7w83es2', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=0', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 27, NULL, '0');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpt004dcwqzrxmqac85', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=1', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 28, NULL, '1');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpw004fcwqzecab4ggw', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=2', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 29, NULL, '2');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvpz004hcwqzgi790diz', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=3', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 30, NULL, '3');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvq1004jcwqz7i01muzk', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=4', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 31, NULL, '4');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvq4004lcwqztx4k7wj9', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=5', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 32, NULL, '5');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvq7004ncwqz61uvtwtn', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=6', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 33, NULL, '6');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvqa004pcwqz1a4aaovd', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=7', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 34, NULL, '7');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvqc004rcwqz0mb8t9yw', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=8', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 35, NULL, '8');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvqe004tcwqzv958usrx', 'Letra dorada', 'charm3d', 'letras', 150, 9, 11, 3, 'procedural://letter?char=9', '[{"x": -4.5, "y": -5.5}, {"x": 4.5, "y": -5.5}, {"x": 4.5, "y": 5.5}, {"x": -4.5, "y": 5.5}]', true, false, 36, NULL, '9');
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvqg004vcwqz50ctcbi5', 'Navidad: arbolito', 'charm3d', 'temporada', 340, 13, 13, 5, 'procedural://xmas?tipo=arbolito', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 0, 'cmrxjyvlk000xcwqzg3s374d9', NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvqj004xcwqzxai0e567', 'Navidad: copo de nieve', 'charm3d', 'temporada', 340, 13, 13, 5, 'procedural://xmas?tipo=copo%20de%20nieve', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 1, 'cmrxjyvlk000xcwqzg3s374d9', NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvqm004zcwqzov5se39k', 'Navidad: bastón de caramelo', 'charm3d', 'temporada', 340, 13, 13, 5, 'procedural://xmas?tipo=bast%C3%B3n%20de%20caramelo', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 2, 'cmrxjyvlk000xcwqzg3s374d9', NULL);
INSERT INTO public."Element" (id, nombre, tipo, categoria, "precioCentimos", "anchoMm", "altoMm", "profundidadMm", "assetUrl", hitbox, activo, "esNuevo", orden, "seasonId", "letraChar") VALUES ('cmrxjyvqp0051cwqzh82ov3b7', 'Navidad: gorro', 'charm3d', 'temporada', 340, 13, 13, 5, 'procedural://xmas?tipo=gorro', '[{"x": 6.5, "y": 0}, {"x": 5.629165124598852, "y": 3.25}, {"x": 3.250000000000001, "y": 5.629165124598851}, {"x": 0.0000000000000003980102097228898, "y": 6.5}, {"x": -3.249999999999999, "y": 5.629165124598852}, {"x": -5.629165124598852, "y": 3.25}, {"x": -6.5, "y": 0.0000000000000007960204194457795}, {"x": -5.629165124598851, "y": -3.250000000000001}, {"x": -3.250000000000003, "y": -5.62916512459885}, {"x": -0.000000000000001194030629168669, "y": -6.5}, {"x": 3.250000000000001, "y": -5.629165124598851}, {"x": 5.629165124598849, "y": -3.250000000000003}]', true, false, 3, 'cmrxjyvlk000xcwqzg3s374d9', NULL);

INSERT INTO public."PresetDesign" (id, slug, nombre, "precioCentimos", "designData", fotos, publicado, orden) VALUES ('cmrxjyw3r0055cwqzl1hfvg8f', 'sueno-rosa', 'Sueño Rosa', 2990, '{"caseSlug": "silicona-soft", "elementos": [{"xMm": 36, "yMm": 75, "elementId": "cmrxjyvlr000zcwqzt0x41xc5", "rotacionGrados": 0}, {"xMm": 36, "yMm": 100, "elementId": "cmrxjyvm8001bcwqzvegzg7wz", "rotacionGrados": 12}, {"xMm": 52, "yMm": 120, "elementId": "cmrxjyvnl002jcwqz5a1o4ajr", "rotacionGrados": 340}], "caseVariantId": "cmrxjyvku000mcwqzuavowtsi"}', '["/img/presets/sueno-rosa.webp"]', true, 0);


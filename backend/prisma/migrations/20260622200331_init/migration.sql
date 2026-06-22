-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenRecord" (
    "id" SERIAL NOT NULL,
    "nic" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fatherNic" TEXT NOT NULL,
    "motherName" TEXT NOT NULL,
    "birthCertificate" TEXT NOT NULL,
    "residentForm" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitizenRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenRecord_nic_key" ON "CitizenRecord"("nic");

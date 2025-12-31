import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../prisma';
const filePath = path.join(process.cwd(), 'src/prisma/JSON/productImages.json');


export async function main() {
    const file = await fs.readFile(filePath, 'utf8');
    const images: { id: number; product_version_id: number; image_url: string; main_image: boolean; product_version: { sku: string } }[] = JSON.parse(file);

    for (const item of images) {
        await prisma.$transaction(async (tx) => {
            const fatherVersion = await tx.productVersion.findUnique({
                where: { sku: item.product_version.sku }
            });

            if (!fatherVersion) throw new Error(`No se encontro a la version padre: ${item.product_version.sku}`);
            await prisma.productVersionImages.create({
                data: {
                    product_version_id: fatherVersion.id,
                    image_url: item.image_url,
                    main_image: item.main_image
                }
            })
        });
    }
}


main()
    .then(
        async () => {
            console.log("Imagenes de version de productos insertadas exitosamente");
            await prisma.$disconnect();
        })
    .catch(
        async (err) => {
            console.error("❌ Error al insertar las imagenes de las versiones de producto:", err);
            await prisma.$disconnect();
            process.exit();
        })
    .finally(
        async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
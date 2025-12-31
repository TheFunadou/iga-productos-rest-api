import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../prisma';
const filePath = path.join(process.cwd(), 'src/prisma/JSON/productSubcategories.json');


export async function main() {
    const file = await fs.readFile(filePath, 'utf8');
    const productSubcategories: { product_id: number; category_attribute_id: number; category_attribute: { uuid: string }; product: { product_name: string } }[] = JSON.parse(file);

    for (const item of productSubcategories) {
        await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { product_name: item.product.product_name }
            });

            if (!product) throw new Error(`No se encontro al producto: ${item.product.product_name}`);

            const subcategoryId = await tx.subcategories.findUnique({
                where: { uuid: item.category_attribute.uuid }, select: { id: true }
            });

            if (!subcategoryId) throw new Error(`No se encontro la subcategoria: ${item.category_attribute.uuid}`);

            await prisma.productSubcategories.create({
                data: {
                    product_id: product.id,
                    subcategory_id: subcategoryId.id,
                }
            })
        });
    }
}


main()
    .then(
        async () => {
            console.log("Subcategorias agregadas a los productos exitosamente");
            await prisma.$disconnect();
        })
    .catch(
        async (err) => {
            console.error("❌ Error al agregar las subcategorias a los productos:", err);
            await prisma.$disconnect();
            process.exit();
        })
    .finally(
        async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
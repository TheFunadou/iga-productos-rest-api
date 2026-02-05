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
            const product = await tx.product.findFirst({
                where: { product_name: { equals: item.product.product_name, mode: "insensitive" } }
            });

            if (!product) throw new Error(`No se encontro al producto: ${item.product.product_name}`);

            console.log("Producto encontrado: ", product.product_name);
            const subcategoryId = await tx.subcategories.findUnique({
                where: { uuid: item.category_attribute.uuid }, select: { id: true }
            });
            if (!subcategoryId) throw new Error(`No se encontro la subcategoria: ${item.category_attribute.uuid}`);

            console.log("Subcategoria encontrada: ", subcategoryId.id);

            const exists = await tx.productSubcategories.findFirst({
                where: {
                    product_id: product.id,
                    subcategory_id: subcategoryId.id
                }, select: { product_id: true }
            });

            if (!exists) {
                console.log("Subcategorias no agregadas al producto")
                await prisma.productSubcategories.create({
                    data: {
                        product_id: product.id,
                        subcategory_id: subcategoryId.id,
                    }
                });
                console.log("Subcategorias agregadas al producto: ", product.product_name);
                console.log("---------------------------------------------------");
            }
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
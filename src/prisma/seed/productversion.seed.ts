import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../prisma';
const filePath = path.join(process.cwd(), 'src/prisma/JSON/productVersion.json');


export async function main() {
    const file = await fs.readFile(filePath, 'utf8');
    const products: { id: number, product_id: number, sku: string, code_bar?: string | null, color_line: string, color_name: string, color_code: string, status: string, stock: number, unit_price: string, technical_sheet_url: string, created_at: Date, updated_at: Date, main_version: boolean, product: { product_name: string } }[] = JSON.parse(file);

    for (const item of products) {
        await prisma.$transaction(async (tx) => {
            console.log(`Buscando producto padre: ${item.product.product_name}`);
            const fatherProduct = await tx.product.findFirst({
                where: { product_name: { equals: item.product.product_name, mode: "insensitive" } }
            });

            if (!fatherProduct) throw new Error(`No se encontro el producto padre: ${item.product.product_name}`);
            console.log(`Producto padre encontrado: ${fatherProduct.product_name}`);

            const productVersionExists = await tx.productVersion.findFirst({
                where: { sku: item.sku }
            });

            if (!productVersionExists) {
                console.log("Insertando version de producto: ", item.sku);
                const productVersion = await tx.productVersion.create({
                    data: {
                        product_id: fatherProduct.id,
                        sku: item.sku,
                        color_line: item.color_line,
                        color_name: item.color_name,
                        color_code: item.color_code,
                        status: item.status,
                        stock: item.stock,
                        unit_price: item.unit_price,
                        technical_sheet_url: item.technical_sheet_url,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        main_version: item.main_version,
                    }
                })
                console.log(`Version de producto insertada exitosamente: ${productVersion.sku}`);
                console.log("--------------------------------------------------");
            }
        });
    }
}


main()
    .then(
        async () => {
            console.log("versiones de productos insertadas exitosamente");
            await prisma.$disconnect();
        })
    .catch(
        async (err) => {
            console.error("❌ Error al insertar las versiones de los productos:", err);
            await prisma.$disconnect();
            process.exit();
        })
    .finally(
        async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
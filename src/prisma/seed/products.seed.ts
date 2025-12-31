import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../prisma';
const filePath = path.join(process.cwd(), 'src/prisma/JSON/products.json');


export async function main() {
    const file = await fs.readFile(filePath, 'utf8');
    const products: { id: number, uuid: string, product_name: string, category_id: number, description: string, specs: string, recommendations: string, applications: string, certifications_desc: string, created_at: Date, updated_at: Date, user_id: number, category: { name: string } }[] = JSON.parse(file);

    const user = await prisma.user.findUnique({ where: { username: "igaSuperUser" }, select: { id: true } });
    if (!user) throw new Error("No se encontro o no esta creado el usuario superuser");
    for (const item of products) {
        await prisma.$transaction(async (tx) => {
            const category = await tx.category.findUnique({
                where: { name: item.category.name }
            });

            if (!category) throw new Error(`No se encontro la categoria asociada a este producto: ${item.category.name}`);
            await prisma.product.create({
                data: {
                    product_name: item.product_name,
                    category_id: category.id,
                    description: item.description,
                    specs: item.specs,
                    recommendations: item.recommendations,
                    applications: item.applications,
                    certifications_desc: item.certifications_desc,
                    user_id: user.id,
                }
            })
        });
    }
}

main()
    .then(
        async () => {
            console.log("Productos insertados exitosamente");
            await prisma.$disconnect();
        })
    .catch(
        async (err) => {
            console.error("❌ Error al insertar los productos:", err);
            await prisma.$disconnect();
            process.exit();
        })
    .finally(
        async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../prisma';
const filePath = path.join(process.cwd(), 'src/prisma/JSON/categories.json');


export async function main() {
    const file = await fs.readFile(filePath, 'utf8');
    const categories: { uuid: string, name: string, created_at: Date, updated_at: Date }[] = JSON.parse(file);

    const categoriesData = categories.map((category) => category.name);

    const created = await prisma.category.createMany({
        data: categoriesData.map((category) => ({ name: category })),
        skipDuplicates: true
    });

    console.log(`Created ${created.count} categories`);
};


main()
    .then(
        async () => {
            console.log("Categorías insertadas exitosamente");
            await prisma.$disconnect();
        })
    .catch(
        async (err) => {
            console.error("❌ Error al crear las categorías:", err);
            await prisma.$disconnect();
            process.exit();
        })
    .finally(
        async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
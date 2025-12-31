import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../prisma';
const filePath = path.join(process.cwd(), 'src/prisma/JSON/subcategories.json');


async function main() {
    const file = await fs.readFile(filePath, 'utf8');
    const subcategories: { uuid: string, description: string, level: number, father_uuid: string, category: { name: string } }[] = JSON.parse(file);

    for (const sub of subcategories) {
        await prisma.$transaction(async (tx) => {
            console.log("subcategoria entrante", sub.description);
            //Si es una subcategoria padre, crear            
            if (sub.father_uuid === null) {
                // Buscar categoria padre
                const category = await tx.category.findUnique({
                    where: { name: sub.category.name }, select: { id: true, uuid: true }
                });

                if (!category) throw new Error("Categoria no encontrada", { cause: sub.category.name });
                console.log("Categoria", category);

                const subcategory = await tx.subcategories.create({
                    data: {
                        uuid: sub.uuid,
                        father_id: null,
                        category_id: category.id,
                        description: sub.description,
                        level: sub.level,
                        father_uuid: null
                    }
                });

                console.log("Subcategoria creada", subcategory.description);
            } else {
                console.log("Es categoria hija")
                // Buscar al padre
                const father = await tx.subcategories.findUnique({
                    where: { uuid: sub.father_uuid }, select: { id: true, uuid: true, description: true, category: { select: { id: true } } }
                });

                if (!father) throw new Error("Padre no encontrado", { cause: sub.father_uuid });
                console.log("Padre encontrado", father.description);

                // Crear la subcategoria
                const subcategory = await tx.subcategories.create({
                    data: {
                        uuid: sub.uuid,
                        category_id: father.category.id,
                        description: sub.description,
                        level: sub.level,
                        father_uuid: father.uuid,
                        father_id: father.id
                    }
                })

                console.log("Subcategoria creada", subcategory.description);
            }
        })
    }

}


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
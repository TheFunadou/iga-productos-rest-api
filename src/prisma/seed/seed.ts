import { prisma } from '../prisma';
import { main as categoriesMain } from './categories.seed';
import { main as productSubcategoriesMain } from './productSubcategories.seed';
import { main as productsMain } from './products.seed';
import { main as productVersionMain } from './productversion.seed';
import { main as productImagesMain } from './productimages.seed';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function main() {
    console.log("Iniciando poblacion de la base de datos...");
    await sleep(3000);
    console.log("Insertando categorias principales...");
    categoriesMain();
    console.log("En ejecucion...")
    await sleep(5000);
    console.log("Insertando subcategorias de los productos...");
    productSubcategoriesMain();
    console.log("En ejecucion...")
    await sleep(5000);
    console.log("Insertando productos...");
    productsMain();
    console.log("En ejecucion...")
    await sleep(5000);
    console.log("Insertando subcategorias de los productos...");
    productSubcategoriesMain();
    console.log("En ejecucion...")
    await sleep(5000);
    console.log("Insertando versiones del los productos")
    productVersionMain();
    console.log("En ejecucion...")
    await sleep(5000);
    console.log("Insertando imagenes al las versiones de los productos")
    productImagesMain();
    console.log("Poblacion terminada exitosamente")
}


main()
    .then(
        async () => {
            console.log("Poblacion exitosa");
            await prisma.$disconnect();
        })
    .catch(
        async (err) => {
            console.error("❌ Error al poblar la base de datos:", err);
            await prisma.$disconnect();
            process.exit();
        })
    .finally(
        async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
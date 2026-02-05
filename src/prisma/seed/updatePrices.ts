import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/index-browser';
const filePath = path.join(process.cwd(), 'src/prisma/JSON/productVersion.json');


export async function main() {
    type Product = {
        sku: string;
        name: string;
        price: string;
    };


    const products: Product[] = [
        { sku: "CAS3-AM2-001", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Matraca', price: "241.99" },
        { sku: "CAS3-AM2-002", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Matraca', price: "241.99" },
        { sku: "CAS3-AM2-003", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Matraca', price: "241.99" },
        { sku: "CAS3-AM2-004", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Matraca', price: "241.99" },
        { sku: "CAS3-AM2-005", name: 'IGA Casco de Seguridad Industrial Marca Modelo Hit, Clase G Matraca', price: "241.99" },
        { sku: "CAS3-AM2-006", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Matraca', price: "241.99" },

        { sku: "CAS3-AI2-001", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Intervalos', price: "212.29" },
        { sku: "CAS3-AI2-002", name: 'IGA Casco de Seguridad Industrial Marca Modelo Hit, Clase G Intervalos', price: "212.29" },
        { sku: "CAS3-AI2-003", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Intervalos', price: "212.29" },
        { sku: "CAS3-AI2-004", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Intervalos', price: "212.29" },
        { sku: "CAS3-AI2-005", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Intervalos', price: "212.29" },
        { sku: "CAS3-AI2-006", name: 'Casco de Seguridad Industrial Marca IGA Modelo Hit, Clase "G" Intervalos', price: "212.29" },

        { sku: "CAS1-AI2-001", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "G" Ajuste Intervalo', price: "219.89" },
        { sku: "CAS1-AI2-002", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "G" Ajuste Intervalo', price: "219.89" },
        { sku: "CAS1-AI2-003", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "G" Ajuste Intervalo', price: "219.89" },
        { sku: "CAS1-AI2-004", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "G" Ajuste Intervalo', price: "219.89" },
        { sku: "CAS1-AI2-005", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "G" Ajuste Intervalo', price: "219.89" },
        { sku: "CAS1-AI2-006", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "G" Ajuste Intervalo', price: "219.89" },
        { sku: "CAS1-AI2-007", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "G" Ajuste Intervalo', price: "219.89" },

        { sku: "CAS1-AM-001", name: 'Iga 403-002 AM Casco de Seguridad Industrial Clase "E"', price: "251.64" },
        { sku: "CAS1-AM-002", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "251.64" },
        { sku: "CAS1-AM-003", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "251.64" },
        { sku: "CAS1-AM-004", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "251.64" },
        { sku: "CAS1-AM-005", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "251.64" },
        { sku: "CAS1-AM-006", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "251.64" },
        { sku: "CAS1-AM-007", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "251.64" },
        { sku: "CAS1-AM-008", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "267.96" },
        { sku: "CAS1-AM-009", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "288.87" },
        { sku: "CAS1-AM-010", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "267.96" },
        { sku: "CAS1-AM-011", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "267.96" },
        { sku: "CAS1-AM-012", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "267.96" },
        { sku: "CAS1-AM-013", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "267.96" },
        { sku: "CAS1-AM-014", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Matraca', price: "267.96" },

        { sku: "CAS1-AI-001", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "228.66" },
        { sku: "CAS1-AI-002", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "228.66" },
        { sku: "CAS1-AI-003", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "228.66" },
        { sku: "CAS1-AI-004", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "228.66" },
        { sku: "CAS1-AI-005", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "228.66" },
        { sku: "CAS1-AI-006", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "228.66" },
        { sku: "CAS1-AI-007", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "228.66" },
        { sku: "CAS1-AI-008", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "233.88" },
        { sku: "CAS1-AI-009", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "242.07" },
        { sku: "CAS1-AI-010", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "233.88" },
        { sku: "CAS1-AI-011", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "233.88" },
        { sku: "CAS1-AI-012", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "233.88" },
        { sku: "CAS1-AI-013", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "233.88" },
        { sku: "CAS1-AI-014", name: 'Casco de Seguridad Industrial Marca IGA, Plagosur Clase "E" Intervalos', price: "233.88" },

        { sku: "CAS2-AM1-001", name: 'Casco de Seguridad Industrial IGA, Coraza Clase "E", Ajuste Matraca', price: "288.29" },
        { sku: "CAS2-AM1-002", name: 'Casco de Seguridad Industrial IGA, Coraza Clase "E", Ajuste Matraca', price: "288.29" },
        { sku: "CAS2-AM1-003", name: 'Casco de Seguridad Industrial IGA, Coraza Clase "E", Ajuste Matraca', price: "288.29" },
        { sku: "CAS2-AM1-004", name: 'Casco de Seguridad Industrial IGA, Coraza Clase "E", Ajuste Matraca', price: "288.29" },
        { sku: "CAS2-AM1-005", name: 'Casco de Seguridad Industrial IGA, Coraza Clase "E", Ajuste Matraca', price: "288.29" },
        { sku: "CAS2-AM1-006", name: 'Casco de Seguridad Industrial IGA, Coraza Clase "E", Ajuste Matraca', price: "288.29" },

        { sku: "LEN1-001-001", name: 'IGA Lentes de Seguridad Industrial, Mica de Policarbonato con Protección Contra Rayos UV, Ártico-Medical', price: "102.06" },
        { sku: "LEN1-001-002", name: 'IGA Lentes de Seguridad Industrial, Mica de Policarbonato con Protección Contra Rayos UV, Ártico-Medical', price: "99.43" },
        { sku: "LEN1-001-003", name: 'IGA Lentes de Seguridad Industrial, Mica de Policarbonato con Protección Contra Rayos UV, Ártico-Medical', price: "99.43" },

        { sku: "BAR-001-001", name: 'IGA Barboquejo para Casco De Seguridad (SIN MENTONERA)', price: "81.53" },
        { sku: "BAR-001-002", name: 'IGA Barboquejo para Casco De Seguridad (con MENTONERA)', price: "89.94" },
        { sku: "BAR-001-003", name: 'IGA Barboquejo para Casco De Seguridad (Cuatro Puntos)', price: "209.64" },

        { sku: "SUS-AI1-001", name: 'Suspensión para casco con ajuste de intervalo con 6 puntos de anclaje', price: "115.54" },
        { sku: "SUS-AM1-001", name: 'Suspensión para casco con ajuste de matraca con 6 puntos de anclaje', price: "157.10" },
        { sku: "SUS-AM2-001", name: 'Suspensión para casco con ajuste de matraca con 4 puntos de anclaje', price: "144.82" },
        { sku: "SUS-AI2-001", name: 'Suspensión para casco con ajuste de intervalo con 4 puntos de anclaje', price: "115.18" },
    ];

    const extractUppercaseFromParentheses = (text: string): string => {
        const match = text.match(/\((\s*[A-ZÁÉÍÓÚÑ]+)\b/);

        if (!match) return "";

        return match[1].trim();
    }

    for (const items of products) {
        const find = await prisma.productVersion.findFirst({ where: { sku: { equals: items.sku, mode: "insensitive" } }, select: { id: true, product: { select: { id: true } } } });
        if (find) {
            const { id, product } = find;
            await prisma.$transaction(async (tx) => {
                await tx.productVersion.update({
                    where: { id },
                    data: {
                        unit_price: new Decimal(items.price)
                    }
                }).catch((error) => console.error("❌ Error al actualizar el precio del producto:", error));

                console.log("OK", items.sku);
            })
        }
    };

}


main()
    .then(
        async () => {
            console.log("precios actualizados actualizados");
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
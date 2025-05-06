
// seed.ts
/*
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Créer des utilisateurs (User) et des EndUser associés
  const endUserIds: number[] = []; // Stocker les IDs des EndUser créés

  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: faker.internet.password(),
        profile: {
          create: {
            firstname: faker.person.firstName(),
            lastname: faker.person.lastName(),
            phonenumber: faker.phone.number(),
            address: faker.location.streetAddress(),
          },
        },
        endUser: {
          create: {
            status: "active",
            lastPos: JSON.stringify({ lat: faker.location.latitude(), lng: faker.location.longitude() }),
          },
        },
      },
      include: {
        endUser: true, // Inclure l'EndUser créé
      },
    });

    if (user.endUser) {
      endUserIds.push(user.endUser.id); // Ajouter l'ID de l'EndUser à la liste
    }

    console.log(`Created User with EndUser: ${user.email}`);
  }

  /* Créer des dispositifs
  for (let i = 0; i < 20; i++) {
    await prisma.device.create({
      data: {
        type: faker.helpers.arrayElement(['Ceinture', 'Canne Augmenté', 'Lunnettes Connectées']),
        version: faker.system.semver(),
        macAdr: faker.internet.mac(),
        status: faker.helpers.arrayElement(['connected', 'disconnected', 'under_maintenance', 'en_panne']),
        battery: faker.number.int({ min: 0, max: 100 }),
        price: faker.number.int({ min: 100, max: 1000 }),
      },
    });
  }*/

  /* Créer des ventes
  for (let i = 0; i < 50; i++) {
    await prisma.sale.create({
      data: {
        device: {
          connect: { id: faker.number.int({ min: 1, max: 20 }) }, // Relier à un dispositif existant
        },
        buyer: {
          connect: { id: faker.helpers.arrayElement(endUserIds) }, // Relier à un EndUser existant
        },
        createdAt: faker.date.past(), // Date de vente aléatoire dans le passé
      },
    });
  }

  // Créer des environnements
  const environmentIds: number[] = []; // Stocker les IDs des environnements créés

  for (let i = 0; i < 5; i++) {
    const environment = await prisma.environment.create({
      data: {
        name: faker.company.name(),
        address: faker.location.streetAddress(),
        cords: JSON.stringify({ lat: faker.location.latitude(), lng: faker.location.longitude() }),
        pathCartographie: faker.system.filePath(),
        scale: faker.number.int({ min: 1, max: 10 }),
      },
    });

    environmentIds.push(environment.id); // Ajouter l'ID de l'environnement à la liste

    console.log(`Created Environment: ${environment.name}`);
  }

  // Créer des zones
  for (let i = 0; i < 10; i++) {
    await prisma.zone.create({
      data: {
        name: faker.location.city(),
        type: faker.helpers.arrayElement(['Zone_de_circulation','Zone_de_travail']),// Remplacez par vos types de zone réels
        color: faker.internet.color(),
        icon: faker.image.url(),
        cords: JSON.stringify({ lat: faker.location.latitude(), lng: faker.location.longitude() }),
        environment: {
          connect: { id: faker.helpers.arrayElement(environmentIds) }, // Relier à un environnement existant
        },
      },
    });

    console.log(`Created Zone: ${i + 1}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    // process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });*/
/*
  import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Create environments first (required for zones)
  const environment = await prisma.environment.create({
    data: {
      name: faker.company.name(),
      address: faker.location.streetAddress(),
      cords: JSON.stringify({ lat: faker.location.latitude(), lng: faker.location.longitude() }),
      pathCartographie: faker.system.filePath(),
      scale: faker.number.int({ min: 1, max: 10 }),
    },
  });

  console.log(`Created Environment: ${environment.name}`);

  // Function to generate a random date within a specific month and year
  function getRandomDateInMonth(year: number, month: number): Date {
    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JavaScript
    const endDate = new Date(year, month, 0); // Last day of the month
    return faker.date.between({ from: startDate, to: endDate });
  }

  // Create zones with specific months (e.g., April and May)
  for (let i = 0; i < 10; i++) {
    // Randomly choose between April and May
    const month = faker.helpers.arrayElement([4, 5]); // April = 4, May = 5
    const createdAt = getRandomDateInMonth(2023, month); // Generate a random date in the chosen month

    await prisma.zone.create({
      data: {
        name: faker.location.city(),
        type: faker.helpers.arrayElement(['Zone_de_circulation','Zone_de_travail']), // Replace with your zone types
        color: faker.internet.color(),
        icon: faker.image.url(),
        cords: JSON.stringify({ lat: faker.location.latitude(), lng: faker.location.longitude() }),
        environment: {
          connect: { id: environment.id }, // Connect to the created environment
        },
        createdAt, // Set the custom createdAt date
      },
    });

    console.log(`Created Zone ${i + 1} in month ${month}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
 //   process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  */
/*

  import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  // Fetch all devices and end users
  const devices = await prisma.device.findMany();
  const endUsers = await prisma.endUser.findMany();

  if (devices.length === 0 || endUsers.length === 0) {
    console.error("No devices or end users found. Please seed devices and end users first.");
    return;
  }

  // Create random sales
  for (let i = 0; i < 50; i++) {
    // Pick a random device and end user
    const randomDevice = faker.helpers.arrayElement(devices);
    const randomEndUser = faker.helpers.arrayElement(endUsers);

    // Create a sale
    await prisma.sale.create({
      data: {
        device: {
          connect: { id: randomDevice.id }, // Connect to a random device
        },
        buyer: {
          connect: { id: randomEndUser.id }, // Connect to a random end user
        },
        createdAt: faker.date.past(), // Random date in the past
      },
    });

    console.log(`Created Sale ${i + 1}`);
  }

  console.log("Sales seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    //process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });*/

 import { PrismaClient } from "@prisma/client"
 /*
import { faker } from "@faker-js/faker";
*/
const prisma = new PrismaClient();

async function main() {
  // Fetch all users
  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.error("No users found. Please seed users first.");
    return;
  }

  // Create random deciders
  for (let i = 0; i < 10; i++) {
    // Pick a random user
    const randomUser = faker.helpers.arrayElement(users);

    // Create a decider
    await prisma.decider.create({
      data: {
        user: {
          connect: { id: randomUser.id }, // Connect to a random user
        },
      },
    });

    console.log(`Created Decider ${i + 1} for User ID: ${randomUser.id}`);
  }

  console.log("Deciders seeding completed successfully!");
}
/*
main()
  .catch((e) => {
    console.error(e);
   // process.exit(1);s
  })
  .finally(async () => {
    await prisma.$disconnect();
  });*/

async function clearDevices(){
  try {
    console.log("Deleting all devices...");
  //  await prisma.device.deleteMany({});
    // add the real device ID = 123
    await prisma.device.create({
      data: {
      id: 123,
      type: "Ceinture",
      status: "Actif",
      price: 200,
      macAdresse: "00:1A:2B:3C:4D:5E",
      nom: "Ceinture connectée",
      cpuUsage: 0,
      ramUsage: 0,
      manufacturingCost: 150,
      localisation: { lat: 48.8566, lng: 2.3522 },
      peripheriques: { sensors: ["accelerometer", "gyroscope"] }
      },
    });
    console.log("done")
  } catch (error) {
    console.log("Error deleting devices:", error);
  }
}

clearDevices()
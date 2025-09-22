import 'tsconfig-paths/register';
import prisma from '@/utils/prisma';
// import updateUserInventoryNames from '@/utils/seed-utils/updateUserInventoryNames';
// import seedRaffleData from '@/utils/seed-utils/raffleSeeder';
// import { generateUsername } from 'unique-username-generator';
// import { upgradesData } from '@/utils/upgrades-data';
// import { TaskType } from '@prisma/client';
// import { earnData } from '@/utils/tasks-data';
// import { unlockRequirementsData } from '@/utils/unlock-requirements-data';
// import { hashPassword } from '@/lib/utils';

// function getRandomNumber(min: number, max: number) {
//   return Math.random() * (max - min) + min;
// }

// const walletData = [
//   { address: '0xe03AD1e5B46C154be36A093C94a0F0720846199a', ton: 200000000 },
//   { address: '0x6A1414E3ee166460a4dB0cfc13738375C2cBc000', ton: 200000000 },
//   { address: '0xa002921b62d4c3A2e72F0b004F588bce8f65D3A2', ton: 200000000 },
//   { address: '0x37b0Cdb1C245A93D0e32776E0EFc27e854c1c856', ton: 200000000 },
//   { address: '0xAe986D17DAE7475F551813FdFD674a0f68F4234a', ton: 200000000 },
//   { address: '0x59d1C1320784Ee58b09F8dC8faa6da0b2A0303F3', ton: 200000000 },
//   { address: '0x38E21a8115875631843494dd7Fe09EAADd53CdB1', ton: 200000000 },
//   { address: '0xBfeA9C0E26D5EC454ED2d42af02cc445138CCe5f', ton: 200000000 },
//   { address: '0x68665eE4E15eAB571625E7cd85F0d41c3146AD9e', ton: 200000000 },
//   { address: '0xDC531A138c7c4eF5826e0859753F070e16893a26', ton: 200000000 },
//   { address: '0xE79B64A01939643490be8B780D6717C1058cb0D3', ton: 200000000 },
//   { address: '0x5B4341d4EE1fd97cC857347547220092da72Ea48', ton: 200000000 },
//   { address: '0x084cEE0Bf7FE8220187800d4b3d6a738F6db0bF2', ton: 100000000 },
//   { address: '0x45bbbFabb68AFd4182649E352304bc25266E0EDa', ton: 100000000 },
//   { address: '0x5764b46e2b865bd1ca4A0C2eFb274Ff361F27D18', ton: 100000000 },
//   { address: '0x08B57Fa29ab2d6e380e88830d70d971ebc5ad57F', ton: 100000000 },
//   { address: '0x980cbaeed967B468BCD7689F302005fE7EE21981', ton: 100000000 },
//   { address: '0x95204648457824105C99467555fd4219c3360af1', ton: 100000000 },
//   { address: '0x62ba6d829796600055c4e60a8b867a335f9f8d84', ton: 100000000 },
//   { address: '0xd9861db12bfa6fe73601f78ba9a23abdce02e3a9', ton: 100000000 },
//   { address: '0x9d84e83D77bAd88D28C436F616d3C233936260cA', ton: 100000000 },
//   { address: '0x33F5A89C0b9Ed0472e7Db3a7c2D9304Aaca8aa28', ton: 100000000 },
//   { address: '0x3Dd79Ef1529988bb15543B37c7d4AAF5B2527125', ton: 100000000 },
//   { address: '0xd3E42339015e85DC142dC4CA835441C924f93f30', ton: 100000000 },
//   { address: '0xa01282f2edbdc4bf2dac8bdad545b13d5846f96a', ton: 100000000 },
//   { address: '0xA7C00512f104C1b533a7628A40d668Aa43BD6274', ton: 100000000 },
//   { address: '0xaC3F1883ac2392A9099221e61E1BB812647f5d67', ton: 100000000 },
//   { address: '0x2A42274422f3eAbC2Ab09fEeaC26D05b8bFDB392', ton: 100000000 },
//   { address: '0xD603a20F061Fbe44C6e31Cff82FfBFAD4eB48FC5', ton: 100000000 },
//   { address: '0xED38f52B0c686bE011b800645EA0cC16B40998d8', ton: 100000000 },
//   { address: '0x3bC200Bbe7394E62851A3Ac4Ddf9565E99EB1F53', ton: 100000000 },
//   { address: '0x007bcAd5b54ca66DB780006495E7B27cb505f2fc', ton: 100000000 },
//   { address: '0x7C33fB3b51ab28935F9c513F034cA7C164877787', ton: 100000000 },
//   { address: '0x591de6e0F6f57bf0c89F93FaF6108297B1ef84D1', ton: 100000000 },
//   { address: '0x438d397987382ce699ba15541e5568453dda8382', ton: 100000000 },
//   { address: '0xA728Aa2De568766E2Fa4544Ec7A77f79c0bf9F97', ton: 100000000 },
//   { address: '0xA18db6e3D645A0DfFcC347C825Ebb5c2c4e5F2B3', ton: 100000000 },
//   { address: '0xAFD68b0BFc1D0d3B9bB53EF4Cff1892B52F88E82', ton: 100000000 },
//   { address: '0x1d8E4abB0c9Cd16bAe3fB52fd91Eb0a9f6738DFC', ton: 100000000 },
//   { address: '0x5A5a4A9756edf180995c2Ee45fB3d161B244b09D', ton: 40000000 },
//   { address: '0x0c8E9667044dA80151d5397A199Ae7e4D78204E3', ton: 40000000 },
//   { address: '0x275443DB3fA7A9856Be44C0a4dE92d9496820689', ton: 40000000 },
//   { address: '0x9dB696e30271ba3b021F44389e118cb245BAF5F6', ton: 40000000 },
//   { address: '0x3dF1969176Ba38753b4CACde023425CfEaa57745', ton: 40000000 },
//   { address: '0x90f23a0B2d0Bb2c50a5bd0ae78c884109214e90b', ton: 40000000 },
//   { address: '0x02D6f866CCf3D41f4d76d80892bdd1eb7929f531', ton: 40000000 },
//   { address: '0x2aad9377bfe7b47900552052b97ab576690625aa', ton: 40000000 },
//   { address: '0x9A53c64ff490Fc3D866e6A3A2388B16B9039b7eb', ton: 40000000 },
//   { address: '0x5f5eA10498215d03773f3471269FF7a1aEe383d0', ton: 40000000 },
//   { address: '0x86136d5ab861faa219654deb2736e0d29edf54cd', ton: 40000000 },
//   { address: '0x7041bB74553fD011268Da863496dA3CBE4Ab8787', ton: 40000000 },
//   { address: '0x73e62DdD54C8f5B577EF6CcBBc602Fbe8Eb898a6', ton: 40000000 },
//   { address: '0xd4707c1a46b4DAC686203b36c63B8EA760429be3', ton: 40000000 },
//   { address: '0xB3e27D022698f12534F9c1f6C1036E4c137CBa19', ton: 40000000 },
//   { address: '0xdf86D4f1bE1cce28BE5da93f76Ba9de4Ccfc37C1', ton: 40000000 },
//   { address: '0x46a4F84F3c119Af44704622713A2cd81c8918ca3', ton: 40000000 },
//   { address: '0xA755B5F65A6718B2B3518de1af4c71BD2Aa1ce9F', ton: 40000000 },
//   { address: '0x9a9e3cE8763c4eEB9D966160924dcc73316Fc89E', ton: 40000000 },
//   { address: '0x4cdE23FbCdFb28d54c773b6AE7800D25e24460A0', ton: 40000000 },
//   { address: '0x10b453C5379877d6b55B71D73Af7D8Fbc69eeF91', ton: 40000000 },
//   { address: '0xAc856Efb02EB519c5301f290C8e1f2Acb0c8e727', ton: 40000000 },
//   { address: '0xF0C23aFE905c9608466eaBF8233e2DA19bfdAa06', ton: 40000000 },
//   { address: '0x31d1b7739216fc1a6f676aafa4bebec8e7baeb68', ton: 20000000 },
//   { address: '0xECF48A0FC63AcFD93Fc321d200C2991c538CA8F1', ton: 20000000 },
//   { address: '0xF32d9bAB8c12394AF2509D703314A90390ed2Ed2', ton: 20000000 },
//   { address: '0xF77f3c1f5e8581cbe30262D31491951c451c815C', ton: 20000000 },
//   { address: '0x057456e07B745047dD36f7999580e782a27273fb', ton: 20000000 },
//   { address: '0x489b992555dd9ae75a52708866b0d65616dad0b0', ton: 20000000 },
//   { address: '0x2957F3e18f2666678848126862D89d39a2cF8c4e', ton: 20000000 },
//   { address: '0xB5eBC90fd0a3A0F4a0Be7cfaF8f030da65bcfAc2', ton: 20000000 },
//   { address: '0xb3f23917c40f9ba3b06ab4bbf3fa38436ef1d674', ton: 20000000 },
//   { address: '0x3607dcc3c919dfd3d48abea47cbeb51934d1a1aa', ton: 20000000 },
//   { address: '0x915ff241af2b953711ebffe82d1dbba528482a7e', ton: 20000000 },
//   { address: '0xB7d775e7151d0FF4039A641Dae1Cacc0635D72C3', ton: 20000000 },
//   { address: '0x22eb056c5CaDc2614C383715ac71c90C748e7242', ton: 20000000 },
//   { address: '0x750F54BeF2499604D9f100Fc5CA2bfa2FbAa4e9d', ton: 20000000 },
//   { address: '0xc078e5be910cb7e04eb06d1e10f276c245342a02', ton: 20000000 },
//   { address: '0x76bd90584F38f27EB02b4F9fef42F0FEA0603EA8', ton: 20000000 }
// ];

// async function createAirdropEntries(users: any[], walletData: any[]) {
//   console.log('Creating airdrop entries for matched users...');
  
//   // First, delete all existing UserAirdrop entries
//   await prisma.userAirdrop.deleteMany();
//   console.log('Deleted existing airdrop entries');

//   // Create a map of wallet addresses to TON amounts for easy lookup
//   const walletToTonMap = new Map(
//     walletData.map(w => [w.address, w.ton])
//   );

//   // Create airdrop entries for each matched user
//   const airdropEntries = users.map(user => ({
//     userId: user.id,
//     telegramId: user.telegramId,
//     username: user.name,
//     price: 0, // Set to 0 as requested
//     priceInTon: walletToTonMap.get(user.erc20Wallet) || 0,
//     createdAt: new Date(),
//     isFake: false
//   }));

//   // Create the entries in batches to avoid overwhelming the database
//   const BATCH_SIZE = 50;
//   for (let i = 0; i < airdropEntries.length; i += BATCH_SIZE) {
//     const batch = airdropEntries.slice(i, i + BATCH_SIZE);
//     await prisma.userAirdrop.createMany({
//       data: batch
//     });
//     console.log(`Created batch ${i / BATCH_SIZE + 1} of ${Math.ceil(airdropEntries.length / BATCH_SIZE)}`);
//   }

//   console.log(`Created ${airdropEntries.length} airdrop entries`);
// }

// async function findUsersByWalletAddresses() {
//   console.log('Searching for users with matching wallet addresses...');
  
//   // Convert addresses to lowercase for case-insensitive comparison
//   const addresses = walletData.map((w) => w.address);
  
//   // Find users with matching wallet addresses
//   const users = await prisma.user.findMany({
//     where: {
//       erc20Wallet: {
//         in: addresses
//       }
//     },
//     select: {
//       id: true,
//       name: true,
//       erc20Wallet: true,
//       telegramId: true
//     }
//   });

//   console.log(`Found ${users.length} matching users out of ${addresses.length} wallet addresses`);
  
//   // Log the results
//   users.forEach((user) => {
//     console.log({
//       name: user.name,
//       userId: user.id,
//       telegramId: user.telegramId,
//       walletAddress: user.erc20Wallet
//     });
//   });

//   // Log unmatched addresses
//   const matchedAddresses = users.map((u) => u.erc20Wallet);
//   const unmatchedAddresses = addresses.filter((addr) => !matchedAddresses.includes(addr));
  
//   if (unmatchedAddresses.length > 0) {
//     console.log('\nUnmatched wallet addresses:');
//     unmatchedAddresses.forEach((addr) => {
//       console.log(addr);
//     });
//   }

//   // Create airdrop entries for matched users
//   await createAirdropEntries(users, walletData);
// }

async function main() {
  console.log('Start seeding...');

  // for (const category of earnData) {
  //   for (const task of category.tasks) {
  //     // Convert the string type to TaskType enum
  //     const taskType = TaskType[task.type as keyof typeof TaskType];

  //     const createdTask = await prisma.task.create({
  //       data: {
  //         title: task.title,
  //         description: task.description,
  //         points: task.points,
  //         type: taskType, // Use the converted TaskType enum value
  //         image: task.image,
  //         callToAction: task.callToAction,
  //         taskData: task.taskData
  //       }
  //     });
  //     console.log(`Created task with id: ${createdTask.id}`);
  //   }
  // }

  // * Create upgrades
  // await prisma.upgrade.createMany({ data: upgradesData });

  // * Create unlock requirements
  // await prisma.unlockRequirement.deleteMany();
  // await prisma.unlockRequirement.createMany({ data: unlockRequirementsData });

  // const taskActions = ['VISIT', 'TELEGRAM', 'TWITTER', 'REFERRAL'];
  // for (const action of taskActions) {
  //   const createdTaskAction = await prisma.taskAction.create({
  //     data: {
  //       name: action
  //     }
  //   });
  //   console.log(`Created task action with id: ${createdTaskAction.id}`);
  // }

  // *  Clear existing items
  // await prisma.shopItem.deleteMany();

  // * Create shop items
  // for (const item of shopItems) {
  //   let invoiceUrl = item.invoiceUrl || null;

  //   if (!invoiceUrl && !(item.price === 0 || item.price === null) && !item.isBasic) {
  //     invoiceUrl = await createInvoiceLink(item);
  //   }

  //   await prisma.shopItem.create({
  //     data: { ...item, invoiceUrl }
  //   });
  // }

  // * Create admin user
  // const hashedPassword = await hashPassword('12345');
  // const admin = await prisma.adminUser.create({
  //   data: {
  //     username: 'admin',
  //     passwordHash: hashedPassword,
  //     firstName: 'JOK',
  //     lastName: 'Admin'
  //   }
  // });

  // * Create fake airdrops

  // *  100 airdrops in the last 5 days
  // await prisma.userAirdrop.deleteMany();
  // const DAYS_COUNT = 1;
  // const FAKE_AIRDROPS_COUNT = 10;
  // for (let i = 0; i < DAYS_COUNT; i++) {
  //   const date = dayjs().subtract(i, "day").toDate(); // Subtract 1 day
  //   for (let j = 0; j < FAKE_AIRDROPS_COUNT; j++) {
  //     const username = generateUsername("");
  //     const price = getRandomNumber(10, 30000);
  //     const airdrop = await prisma.userAirdrop.create({
  //       data: {
  //         createdAt: date,
  //         isFake: true,
  //         price,
  //         priceInTon: price / 5.43,
  //         username,
  //       },
  //     });
  //
  //     console.log(airdrop);
  //   }
  // }

  // * Create fake airdrops from price list
  // const TON_PRICE = 5.43;
  // await prisma.userAirdrop.deleteMany();
  // const createdAt = new Date("2025-01-20T11:12:10.173Z");
  // const airdrops = [
  //   {
  //     isFake: true,
  //     price: 30000,
  //     priceInTon: 30000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "naruto",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 20000,
  //     priceInTon: 20000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "luffy",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 10000,
  //     priceInTon: 10000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "hulk",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 5000,
  //     priceInTon: 5000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "character12",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 5000,
  //     priceInTon: 5000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "character6",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 5000,
  //     priceInTon: 5000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "character5",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 5000,
  //     priceInTon: 5000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "character4",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 5000,
  //     priceInTon: 5000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "character3",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 5000,
  //     priceInTon: 5000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "character2",
  //     createdAt,
  //   },
  //   {
  //     isFake: true,
  //     price: 5000,
  //     priceInTon: 5000 / TON_PRICE,
  //     username: generateUsername("").toUpperCase(),
  //     equippedAvatar: "character1",
  //     createdAt,
  //   },
  // ];

  // for (let airdrop of airdrops) {
  //   console.log(airdrop);
  //   await prisma.userAirdrop.create({
  //     data: airdrop,
  //   });
  // }

  // const BATCH_SIZE = 1000; // Adjust based on your needs
  // let skip = 0;
  // let totalUpdated = 0;
  // let hasMoreRecords = true;

  // // Get total count for logging purposes
  // const totalUsers = await prisma.user.count();
  // console.log(`Found ${totalUsers} users to update`);

  // // Process in batches
  // while (hasMoreRecords) {
  //   // Get a batch of user IDs
  //   const users = await prisma.user.findMany({
  //     select: { id: true },
  //     skip: skip,
  //     take: BATCH_SIZE
  //   });

  //   if (users.length === 0) {
  //     hasMoreRecords = false;
  //     continue;
  //   }

  //   // Extract IDs for the current batch
  //   const userIds = users.map((user) => user.id);

  //   // Update this batch
  //   const updateResult = await prisma.user.updateMany({
  //     where: {
  //       id: {
  //         in: userIds
  //       }
  //     },
  //     data: {
  //       totalStars: 0,
  //       earnedStars: 0
  //     }
  //   });

  //   totalUpdated += updateResult.count;
  //   console.log(`Updated batch: ${skip} to ${skip + users.length} (${updateResult.count} records)`);

  //   // Move to the next batch
  //   skip += BATCH_SIZE;

  //   // Safety check - exit if we've processed all records
  //   if (users.length < BATCH_SIZE) {
  //     hasMoreRecords = false;
  //   }
  // }

  // console.log(`Total updated: ${totalUpdated} out of ${totalUsers} users`);

  //* to add/update fields
  // try {
  //   const result = await prisma.$runCommandRaw({
  //     update: 'User', // Your collection name
  //     updates: [
  //       {
  //         q: {},
  //         u: {
  //           $set: {
  //             reminderSent3: false,
  //             reminderSent6: false,
  //             reminderSent14: false
  //           }
  //         },
  //         multi: true
  //       }
  //     ]
  //   });

  //   console.log('Prisma update result:', result);
  // } catch (error) {
  //   console.error('Error using Prisma to add fields:', error);
  // }

  // await seedRaffleData();

  // await updateUserInventoryNames();

  //* Find and add users for airdrop
  // await findUsersByWalletAddresses();

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

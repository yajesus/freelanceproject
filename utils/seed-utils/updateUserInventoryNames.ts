// updateFieldsWithRunCommandRaw.ts
import prisma from '@/utils/prisma';

async function updateUserInventoryNames() {
  try {
    console.log('Starting update process using $runCommandRaw...');

    // 1. Update equippedAvatarName field
    console.log('Updating avatar names...');
    const avatarResult = await prisma.$runCommandRaw({
      aggregate: 'UserInventory',
      pipeline: [
        // Match all documents with an equippedAvatar field that's not null
        { $match: { equippedAvatar: { $exists: true, $ne: null } } },
        // Lookup the corresponding ShopItem
        {
          $lookup: {
            from: 'ShopItem',
            let: { avatarId: '$equippedAvatar' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$avatarId' }] } } },
              { $project: { image: 1 } }
            ],
            as: 'avatarItem'
          }
        },
        // Only proceed with documents where we found a matching ShopItem
        { $match: { 'avatarItem.0': { $exists: true } } },
        // Add the equippedAvatarName field
        {
          $addFields: {
            equippedAvatarName: { $arrayElemAt: ['$avatarItem.image', 0] }
          }
        },
        // Remove the temporary avatarItem field
        { $project: { avatarItem: 0 } },
        // Merge the results back to the UserInventory collection
        {
          $merge: {
            into: 'UserInventory',
            on: '_id',
            whenMatched: 'merge',
            whenNotMatched: 'discard'
          }
        }
      ],
      cursor: {}
    });

    console.log('Avatar names update result:', avatarResult);

    // 2. Update equippedBackgroundName field
    console.log('Updating background names...');
    const backgroundResult = await prisma.$runCommandRaw({
      aggregate: 'UserInventory',
      pipeline: [
        // Match all documents with an equippedBackground field that's not null
        { $match: { equippedBackground: { $exists: true, $ne: null } } },
        // Lookup the corresponding ShopItem
        {
          $lookup: {
            from: 'ShopItem',
            let: { backgroundId: '$equippedBackground' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$backgroundId' }] } } },
              { $project: { image: 1 } }
            ],
            as: 'backgroundItem'
          }
        },
        // Only proceed with documents where we found a matching ShopItem
        { $match: { 'backgroundItem.0': { $exists: true } } },
        // Add the equippedBackgroundName field
        {
          $addFields: {
            equippedBackgroundName: { $arrayElemAt: ['$backgroundItem.image', 0] }
          }
        },
        // Remove the temporary backgroundItem field
        { $project: { backgroundItem: 0 } },
        // Merge the results back to the UserInventory collection
        {
          $merge: {
            into: 'UserInventory',
            on: '_id',
            whenMatched: 'merge',
            whenNotMatched: 'discard'
          }
        }
      ],
      cursor: {}
    });

    console.log('Background names update result:', backgroundResult);
    console.log('Update complete!');
  } catch (error) {
    console.error('Error updating name fields:', error);
  }
}

export default updateUserInventoryNames;

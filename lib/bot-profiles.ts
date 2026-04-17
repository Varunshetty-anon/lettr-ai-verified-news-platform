import dbConnect from './mongodb';
import { User, IUser } from '../models/User';

export const BOT_PROFILES = [
  { name: 'TechNews Bot', email: 'techbot@lettr.ai', role: 'AUTHOR', trustScore: 92, isVerifiedAuthor: true },
  { name: 'GlobalPolitics Bot', email: 'politicsbot@lettr.ai', role: 'AUTHOR', trustScore: 88, isVerifiedAuthor: true },
  { name: 'Finance Bot', email: 'financebot@lettr.ai', role: 'AUTHOR', trustScore: 85, isVerifiedAuthor: true },
  { name: 'AI Insider Bot', email: 'aibot@lettr.ai', role: 'AUTHOR', trustScore: 95, isVerifiedAuthor: true },
  { name: 'WorldNews Bot', email: 'worldbot@lettr.ai', role: 'AUTHOR', trustScore: 78, isVerifiedAuthor: true },
  { name: 'Science Bot', email: 'sciencebot@lettr.ai', role: 'AUTHOR', trustScore: 90, isVerifiedAuthor: true },
  { name: 'Crypto Bot', email: 'cryptobot@lettr.ai', role: 'AUTHOR', trustScore: 82, isVerifiedAuthor: true },
  { name: 'Space Bot', email: 'spacebot@lettr.ai', role: 'AUTHOR', trustScore: 91, isVerifiedAuthor: true },
  { name: 'Health Bot', email: 'healthbot@lettr.ai', role: 'AUTHOR', trustScore: 87, isVerifiedAuthor: true },
  { name: 'Energy Bot', email: 'energybot@lettr.ai', role: 'AUTHOR', trustScore: 84, isVerifiedAuthor: true },
  { name: 'Defense Bot', email: 'defensebot@lettr.ai', role: 'AUTHOR', trustScore: 86, isVerifiedAuthor: true },
  { name: 'Startup Bot', email: 'startupbot@lettr.ai', role: 'AUTHOR', trustScore: 83, isVerifiedAuthor: true },
];

export async function getVerifiedBots(): Promise<IUser[]> {
  await dbConnect();
  
  const activeBots: IUser[] = [];

  for (const bot of BOT_PROFILES) {
    let dbBot = await User.findOne({ email: bot.email });
    
    if (!dbBot) {
        dbBot = await User.create({
            name: bot.name,
            email: bot.email,
            role: bot.role,
            trustScore: bot.trustScore,
            isVerifiedAuthor: bot.isVerifiedAuthor,
            totalPosts: 0
        });
    }
    activeBots.push(dbBot);
  }

  return activeBots;
}

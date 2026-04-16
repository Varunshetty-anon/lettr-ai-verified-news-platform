import dbConnect from './mongodb';
import { User, IUser } from '../models/User';

export const BOT_PROFILES = [
  { name: 'TechNews Bot', email: 'techbot@lettr.ai', role: 'AUTHOR', trustScore: 92 },
  { name: 'GlobalPolitics Bot', email: 'politicsbot@lettr.ai', role: 'AUTHOR', trustScore: 88 },
  { name: 'Finance Bot', email: 'financebot@lettr.ai', role: 'AUTHOR', trustScore: 85 },
  { name: 'AI Insider Bot', email: 'aibot@lettr.ai', role: 'AUTHOR', trustScore: 95 },
  { name: 'WorldNews Bot', email: 'worldbot@lettr.ai', role: 'AUTHOR', trustScore: 78 },
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
            totalPosts: 0
        });
    }
    activeBots.push(dbBot);
  }

  return activeBots;
}

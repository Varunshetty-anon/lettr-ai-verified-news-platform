sed -i "s/role: bot.role,/role: bot.role as 'READER' | 'AUTHOR',/g" ./lib/bot-profiles.ts

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;

if (!token) {
  console.error("BOT_TOKEN is missing. Copy .env.example to .env and add your Telegram bot token.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const sessions = new Map();

const prices = [
  "Почасовой - 150 сом / 1 час",
  "Дневной - 700 сом / до 6 часов",
  "Ночной - 1000 сом / ночной пакет",
  "Абонемент - от 2500 сом для постоянных игроков"
];

const games = [
  "FIFA - футбольный симулятор",
  "Mortal Kombat - файтинг",
  "GTA - открытый мир",
  "UFC - смешанные единоборства",
  "Также доступны гонки, приключения, хорроры и спортивные игры"
];

const mainKeyboard = {
  reply_markup: {
    keyboard: [
      ["🎮 Игры", "💸 Цены"],
      ["📍 Контакты", "🕹 Забронировать"],
      ["🏆 Турниры"]
    ],
    resize_keyboard: true
  }
};

function contactsText() {
  return [
    "📍 Sony Karakol",
    "Адрес: г. Каракол, центр города",
    "Телефон: +996 700 000 000",
    "Email: sonykarakol@example.com",
    "Режим работы: ежедневно 10:00 - 02:00"
  ].join("\n");
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Добро пожаловать в Sony Karakol! Выберите действие в меню.",
    mainKeyboard
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const session = sessions.get(chatId);

  if (text === "/start") return;

  if (session?.mode === "booking") {
    if (!session.name) {
      session.name = text.trim();
      sessions.set(chatId, session);
      return bot.sendMessage(chatId, "Введите номер телефона:");
    }

    if (!session.phone) {
      session.phone = text.trim();
      sessions.set(chatId, session);
      return bot.sendMessage(chatId, "Укажите дату, время и желаемый тариф:");
    }

    const bookingText = [
      "Новая заявка на бронирование:",
      `Имя: ${session.name}`,
      `Телефон: ${session.phone}`,
      `Детали: ${text.trim()}`,
      `Telegram chat: ${chatId}`
    ].join("\n");

    if (adminChatId) {
      try {
        await bot.sendMessage(adminChatId, bookingText);
      } catch (err) {
        console.error("Ошибка отправки админу:", err);
      }
    }

    sessions.delete(chatId);
    return bot.sendMessage(
      chatId,
      "Спасибо! Заявка принята. Администратор свяжется с вами для подтверждения.",
      mainKeyboard
    );
  }

  if (text === "🎮 Игры") {
    return bot.sendMessage(chatId, games.join("\n"));
  }

  if (text === "💸 Цены") {
    return bot.sendMessage(chatId, prices.join("\n"));
  }

  if (text === "📍 Контакты") {
    return bot.sendMessage(chatId, contactsText());
  }

  if (text === "🏆 Турниры") {
    return bot.sendMessage(
      chatId,
      "Турниры проводятся по FIFA, UFC и Mortal Kombat. Напишите администратору или оставьте заявку на бронь."
    );
  }

  if (text === "🕹 Забронировать") {
    sessions.set(chatId, { mode: "booking" });
    return bot.sendMessage(chatId, "Введите ваше имя:");
  }

  return bot.sendMessage(chatId, "Выберите действие в меню.", mainKeyboard);
});

console.log("Sony Karakol bot is running.");

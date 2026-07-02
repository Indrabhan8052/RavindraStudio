// models/Settings.js
const db = require('../config/db');

const Settings = {
    async getAll() {
        const [rows] = await db.query(`SELECT * FROM settings`);
        const settings = {};
        rows.forEach(row => { settings[row.setting_key] = row.setting_value; });
        return settings;
    },

    async get(key, fallback = null) {
        const [rows] = await db.query(`SELECT setting_value FROM settings WHERE setting_key = ?`, [key]);
        return rows[0] ? rows[0].setting_value : fallback;
    },

    async set(key, value) {
        await db.query(
            `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [key, value]
        );
    },

    async setMultiple(obj) {
        for (const [key, value] of Object.entries(obj)) {
            await this.set(key, value);
        }
    }
};

module.exports = Settings;

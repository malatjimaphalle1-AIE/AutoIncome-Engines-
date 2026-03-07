import fs from 'fs';
import path from 'path';

const DATA_FILE = process.env.VERCEL 
    ? path.resolve('/tmp', 'data.json')
    : path.resolve(process.cwd(), 'data.json');

export const loadData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        return { referrals: [], users: [], referralClicks: [] };
    }
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        // Ensure arrays exist
        if (!data.users) data.users = [];
        if (!data.referrals) data.referrals = [];
        if (!data.referralClicks) data.referralClicks = [];
        return data;
    } catch (error) {
        console.error("Error reading data.json:", error);
        return { referrals: [], users: [], referralClicks: [] };
    }
};

export const saveData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing data.json:", error);
    }
};

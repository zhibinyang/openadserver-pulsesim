import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type UserGroup = 'whale' | 'minnow' | 'browser' | 'newbie';

export interface PoolUser {
  user_id: string;
  group: UserGroup;
  createdAt: number;
  country: string;
  city: string;
  ip: string;
  os: string;
  browser: string;
  device: string;
  interests: string[];
  age: number;
  gender: 'male' | 'female' | 'other';
}

export interface UserPoolStats {
  totalUsers: number;
  groupDistribution: Record<UserGroup, number>;
  oldestUserTimestamp: number;
  newestUserTimestamp: number;
}

export class UserPoolRegistry {
  private static instance: UserPoolRegistry;
  private userPool: PoolUser[] = [];
  private readonly poolPath = path.join(process.cwd(), 'data', 'user_pool.json');
  public readonly DEFAULT_POOL_SIZE = parseInt(process.env.USER_POOL_SIZE || '50000', 10);
  public readonly DAILY_ROTATION_COUNT = parseInt(process.env.USER_ROTATION_COUNT || '1000', 10);
  private readonly GROUP_DISTRIBUTION: Record<Exclude<UserGroup, 'newbie'>, number> = {
    whale: 0.05,
    minnow: 0.20,
    browser: 0.75
  };

  // Country to city mapping
  private readonly COUNTRY_CITY_MAP: Record<string, string> = {
    'US': 'Washington D.C.', 'CN': 'Beijing', 'JP': 'Tokyo', 'KR': 'Seoul', 'GB': 'London',
    'DE': 'Berlin', 'FR': 'Paris', 'CA': 'Ottawa', 'AU': 'Canberra', 'IN': 'New Delhi',
    'BR': 'Brasilia', 'RU': 'Moscow', 'SG': 'Singapore', 'HK': 'Hong Kong', 'TW': 'Taipei',
    'ID': 'Jakarta', 'TH': 'Bangkok', 'VN': 'Hanoi', 'MY': 'Kuala Lumpur', 'PH': 'Manila',
    'MX': 'Mexico City', 'IT': 'Rome', 'ES': 'Madrid', 'NL': 'Amsterdam', 'SE': 'Stockholm',
    'CH': 'Bern', 'PL': 'Warsaw', 'TR': 'Ankara', 'SA': 'Riyadh', 'AE': 'Abu Dhabi',
    'IL': 'Jerusalem', 'ZA': 'Pretoria', 'NG': 'Abuja', 'EG': 'Cairo', 'AR': 'Buenos Aires',
    'CL': 'Santiago', 'CO': 'Bogota', 'NZ': 'Wellington', 'IE': 'Dublin', 'AT': 'Vienna'
  };

  // Generate IP based on country
  private generateIP(country: string): string {
    const prefixes: any = { 'US': 104, 'CN': 202, 'JP': 150, 'GB': 80 };
    const p1 = prefixes[country] || (Math.floor(Math.random() * 200) + 10);
    return `${p1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  // Get matching browser for OS
  private getBrowserForOS(os: string): string {
    const browsersByOS: Record<string, string[]> = {
      'ios': ['safari', 'chrome'],
      'android': ['chrome', 'firefox'],
      'macos': ['safari', 'chrome', 'firefox'],
      'windows': ['chrome', 'edge', 'firefox'],
      'linux': ['chrome', 'firefox']
    };
    const options = browsersByOS[os] || ['chrome'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private constructor() {
    this.ensureDataDirExists();
    this.loadFromDisk();
  }

  public static getInstance(): UserPoolRegistry {
    if (!UserPoolRegistry.instance) {
      UserPoolRegistry.instance = new UserPoolRegistry();
    }
    return UserPoolRegistry.instance;
  }

  private ensureDataDirExists(): void {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.poolPath)) {
        const data = fs.readFileSync(this.poolPath, 'utf-8');
        this.userPool = JSON.parse(data);
        console.log(`Loaded user pool with ${this.userPool.length} users from disk`);
      } else {
        console.log('No existing user pool found, will generate initial pool on first run');
      }
    } catch (error) {
      console.error('Error loading user pool from disk:', error);
      this.userPool = [];
    }
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(this.poolPath, JSON.stringify(this.userPool, null, 2));
    } catch (error) {
      console.error('Error saving user pool to disk:', error);
    }
  }

  public isInitialized(): boolean {
    return this.userPool.length === this.DEFAULT_POOL_SIZE;
  }

  public generateInitialPool(userTemplates: Omit<PoolUser, 'user_id' | 'group' | 'createdAt' | 'city' | 'ip' | 'browser'>[]): void {
    if (this.isInitialized()) {
      return;
    }

    console.log(`Generating initial user pool of ${this.DEFAULT_POOL_SIZE} users...`);
    this.userPool = [];

    const totalNonNewbieUsers = this.DEFAULT_POOL_SIZE * 0.9; // 90% existing groups, 10% newbies

    // Generate non-newbie users
    Object.entries(this.GROUP_DISTRIBUTION).forEach(([group, ratio]) => {
      const count = Math.floor(totalNonNewbieUsers * ratio);
      for (let i = 0; i < count; i++) {
        const template = userTemplates[Math.floor(Math.random() * userTemplates.length)];
        const city = this.COUNTRY_CITY_MAP[template.country] || 'Unknown';
        const ip = this.generateIP(template.country);
        const browser = this.getBrowserForOS(template.os);
        this.userPool.push({
          ...template,
          city,
          ip,
          browser,
          user_id: uuidv4(),
          group: group as UserGroup,
          createdAt: Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000 // Random age up to 10 days
        });
      }
    });

    // Generate 10% newbies
    const newbieCount = this.DEFAULT_POOL_SIZE - this.userPool.length;
    for (let i = 0; i < newbieCount; i++) {
      const template = userTemplates[Math.floor(Math.random() * userTemplates.length)];
      const city = this.COUNTRY_CITY_MAP[template.country] || 'Unknown';
      const ip = this.generateIP(template.country);
      const browser = this.getBrowserForOS(template.os);
      this.userPool.push({
        ...template,
        city,
        ip,
        browser,
        user_id: uuidv4(),
        group: 'newbie',
        createdAt: Date.now() - Math.random() * 24 * 60 * 60 * 1000 // Created in last 24 hours
      });
    }

    this.saveToDisk();
    console.log(`Initial user pool generated successfully, ${this.userPool.length} users`);
  }

  public getRandomUser(): PoolUser {
    if (!this.isInitialized()) {
      throw new Error('User pool not initialized');
    }
    return this.userPool[Math.floor(Math.random() * this.userPool.length)];
  }

  public rotateUsers(removeCount: number, newUserTemplates: Omit<PoolUser, 'user_id' | 'group' | 'createdAt' | 'city' | 'ip' | 'browser'>[]): PoolUser[] {
    // Sort users by creation date (oldest first)
    this.userPool.sort((a, b) => a.createdAt - b.createdAt);

    // Remove oldest N users
    const removedUsers = this.userPool.splice(0, removeCount);
    console.log(`Rotated out ${removedUsers.length} oldest users`);

    // Add new users as newbies
    const newUsers: PoolUser[] = [];
    for (let i = 0; i < removeCount; i++) {
      const template = newUserTemplates[Math.floor(Math.random() * newUserTemplates.length)];
      const city = this.COUNTRY_CITY_MAP[template.country] || 'Unknown';
      const ip = this.generateIP(template.country);
      const browser = this.getBrowserForOS(template.os);
      newUsers.push({
        ...template,
        city,
        ip,
        browser,
        user_id: uuidv4(),
        group: 'newbie',
        createdAt: Date.now()
      });
    }

    // Convert oldest 10% of existing users from newbies to permanent groups
    const existingNewbies = this.userPool.filter(u => u.group === 'newbie');
    const convertCount = Math.floor(existingNewbies.length * 0.9); // Leave 10% as newbies
    existingNewbies.sort((a, b) => a.createdAt - b.createdAt);

    for (let i = 0; i < convertCount; i++) {
      const user = existingNewbies[i];
      const rand = Math.random();
      if (rand < this.GROUP_DISTRIBUTION.whale) {
        user.group = 'whale';
      } else if (rand < this.GROUP_DISTRIBUTION.whale + this.GROUP_DISTRIBUTION.minnow) {
        user.group = 'minnow';
      } else {
        user.group = 'browser';
      }
    }

    // Add new users to pool
    this.userPool.push(...newUsers);

    // Save to disk
    this.saveToDisk();

    console.log(`Added ${newUsers.length} new users to pool, total size: ${this.userPool.length}`);
    return removedUsers;
  }

  public getStats(): UserPoolStats {
    const distribution = {
      whale: 0,
      minnow: 0,
      browser: 0,
      newbie: 0
    };

    this.userPool.forEach(user => {
      distribution[user.group]++;
    });

    const timestamps = this.userPool.map(u => u.createdAt);

    return {
      totalUsers: this.userPool.length,
      groupDistribution: distribution,
      oldestUserTimestamp: Math.min(...timestamps),
      newestUserTimestamp: Math.max(...timestamps)
    };
  }
}

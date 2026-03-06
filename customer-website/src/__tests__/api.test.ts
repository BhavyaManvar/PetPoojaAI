import { describe, it, expect } from 'vitest';
import { API } from '@/lib/api';

describe('API endpoints', () => {
  it('menuItems returns correct URL without category', () => {
    expect(API.menuItems()).toContain('/menu/items');
    expect(API.menuItems()).not.toContain('category=');
  });

  it('menuItems returns category-filtered URL', () => {
    const url = API.menuItems('Curry');
    expect(url).toContain('/menu/items?category=Curry');
  });

  it('encodes special characters in category', () => {
    const url = API.menuItems('Rice & Biryani');
    expect(url).toContain(encodeURIComponent('Rice & Biryani'));
  });

  it('orderPush points to /order/push', () => {
    expect(API.orderPush).toContain('/order/push');
  });

  it('orderList defaults to limit=20', () => {
    expect(API.orderList()).toContain('limit=20');
  });

  it('orderList accepts custom limit', () => {
    expect(API.orderList(50)).toContain('limit=50');
  });

  it('authVerify points to /auth/verify', () => {
    expect(API.authVerify).toContain('/auth/verify');
  });
});

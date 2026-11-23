import { describe, expect, it } from 'vitest'
import { lan as zh } from '../china_zh'
import { lan as en } from '../us_en'
import { currentLocale, DEFAULT_LOCALE, fmt, lan } from '..'

describe('lang', () => {
  it('has the same keys in Chinese and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('uses the default language when none was chosen', () => {
    expect(currentLocale).toBe(DEFAULT_LOCALE)
    expect(lan.followUpTodo).toBe(zh.followUpTodo)
  })

  it('fills numbered placeholders', () => {
    expect(fmt(en.followUpSummary, 3, 1)).toBe('3 follow-ups open, 1 due today.')
    expect(fmt(zh.followUpSummary, 3, 1)).toBe('共 3 项待跟进，其中 1 项今天截止。')
    expect(fmt('{0} and {1}', 'a')).toBe('a and {1}')
  })
})

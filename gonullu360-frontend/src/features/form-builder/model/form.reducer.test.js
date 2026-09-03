import { describe, expect, test } from 'vitest';
import { createEmptyForm, createField, isFormPublishable } from './form.schema';
import { formReducer } from './form.reducer';

describe('form builder modeli', () => {
  test('boş form benzersiz kimlikli iki bölümle oluşturulur', () => {
    const form = createEmptyForm();
    expect(form.sections).toHaveLength(2);
    expect(form.sections[0].id).not.toBe(form.sections[1].id);
    expect(isFormPublishable(form)).toBe(false);
  });

  test('alan ekleme ve güncelleme işlemleri değişmez veri üretir', () => {
    const original = createEmptyForm();
    const withField = formReducer(original, { type: 'ADD_FIELD', sectionId: original.sections[0].id, fieldType: 'email' });
    const field = withField.sections[0].fields[0];
    const updated = formReducer(withField, { type: 'UPDATE_FIELD', fieldId: field.id, changes: { required: true } });
    expect(original.sections[0].fields).toHaveLength(0);
    expect(updated.sections[0].fields[0].required).toBe(true);
    expect(isFormPublishable(updated)).toBe(true);
  });

  test('dosya alanı güvenli varsayılanlara sahiptir', () => {
    const field = createField('file');
    expect(field.fileSettings.maxSizeMb).toBe(10);
    expect(field.fileSettings.acceptedTypes).toContain('.pdf');
  });
});

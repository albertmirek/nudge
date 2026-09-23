import * as Clipboard from 'expo-clipboard';
import { Contact, requestPermissionsAsync } from 'expo-contacts';

/** Clipboard text, or '' when empty or when iOS paste permission is denied. */
export async function readClipboard(): Promise<string> {
  if (!(await Clipboard.hasStringAsync())) return '';
  return Clipboard.getStringAsync();
}

/** Opens the system contact picker; returns the picked contact's phones and emails, or null. */
export async function pickContactValues(): Promise<string[] | null> {
  const permission = await requestPermissionsAsync();
  if (!permission.granted) return null;
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const [phones, emails] = await Promise.all([contact.getPhones(), contact.getEmails()]);
  return [...phones.map((phone) => phone.number), ...emails.map((email) => email.address)].filter(
    (value): value is string => Boolean(value),
  );
}

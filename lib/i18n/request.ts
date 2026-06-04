import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, LOCALE_COOKIE } from './config';
import { getConlangMessages, mergeMessages } from './conlang-messages';

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value || defaultLocale;

  let messages: Record<string, any>;
  
  // Try to load base English translations
  try {
    messages = (await import(`../../messages/en.json`)).default;
  } catch (error) {
    messages = {};
    console.error('Failed to load English messages', error);
  }

  // If locale specifies a conlang, load it and merge
  if (localeCookie.startsWith('conlang:')) {
    const languageId = localeCookie.split(':')[1];
    if (languageId) {
      const conlangMessages = await getConlangMessages(languageId);
      messages = mergeMessages(messages, conlangMessages);
    }
    return {
      locale: localeCookie,
      messages
    };
  }
  
  // Try to load natural language translations if it's not 'en'
  if (localeCookie !== 'en') {
      try {
        const natMessages = (await import(`../../messages/${localeCookie}.json`)).default;
        messages = mergeMessages(messages, natMessages);
      } catch (error) {
          // Fallback to English
      }
  }

  return {
    locale: localeCookie,
    messages
  };
});

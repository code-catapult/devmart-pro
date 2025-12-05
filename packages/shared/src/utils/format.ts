// Format number with commas
export const formatNumber = (num: number, locale = "en-US") => {
  return new Intl.NumberFormat(locale).format(num);
};

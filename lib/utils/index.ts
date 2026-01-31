export const getStartEndDate = (days: number) => {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days); // last x days including today
  const startDateString = startDate.toISOString().slice(0, 10);

  return { startDateString, endDate };
};

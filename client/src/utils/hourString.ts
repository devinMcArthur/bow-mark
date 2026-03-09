const hourString = (time: number | string) => {
  if (typeof time === "number") {
    if (time > 1) return "hours";
    else return "hour";
  } else {
    if (parseInt(time) > 1) return "hours";
    else return "hour";
  }
};

export default hourString;

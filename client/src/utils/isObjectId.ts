const isObjectId = (val: string) => val.match(/^[a-f\d]{24}$/i);

export default isObjectId;

import { officeNumber } from "../../constants/numbers";

interface IContactOffice {
  text?: string;
}

const ContactOffice = ({ text = "office" }: IContactOffice) => {
  return <a href={`tel:${officeNumber}`}>{text}</a>;
};

export default ContactOffice;

const baseStyle = {
  backgroundColor: "white",
  padding: "2",
  my: "2",
  borderRadius: "0.25em",
  width: "100%",
  boxShadow: "bottomShadow",
};

const Card = {
  baseStyle,
  variants: {
    full: {
      border: "1px solid gray",
      padding: "2",
      margin: "2",
      marginLeft: "0px",
      marginRight: "0px",
      borderRadius: "0.25em",
      width: "100%",
    },
    /**
     * Flatter card used on content-heavy surfaces (jobsite page lists,
     * daily report cards) where the bottomShadow version felt too
     * elevated stacked up. Thin border + no shadow reads as clean and
     * modern without losing the card boundary.
     */
    flat: {
      backgroundColor: "white",
      padding: "3",
      my: "2",
      border: "1px solid",
      borderColor: "gray.200",
      borderRadius: "0.5em",
      width: "100%",
      boxShadow: "none",
    },
  },
};

export default Card;

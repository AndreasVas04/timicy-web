/**
 * "How it works" / about page content for both locales.
 *
 * Reviewed by a human before launch: PENDING
 *
 * Unlike the privacy/terms pages, the about page has a richer structure:
 * an intro (array of paragraphs), a list of store names (rendered as
 * chips), feature blocks (heading + body, rendered as cards), and an
 * outro paragraph. The page component reads the locale param and renders
 * the matching locale object.
 */

export interface AboutBlock {
  heading: string;
  body: string;
}

export interface AboutPageContent {
  title: string;
  intro: string[];
  stores: string[];
  blocks: AboutBlock[];
  outro: string;
}

const about: Record<string, AboutPageContent> = {
  el: {
    title: "Πώς λειτουργεί το TimiCY",
    intro: [
      "Το TimiCY συγκρίνει τιμές ηλεκτρονικών και οικιακών συσκευών από έξι καταστήματα της Κύπρου (iStorm, Kotsovolos, Stephanis, Electroline, Public και Bionic) σε 21 κατηγορίες προϊόντων.",
      "Κάθε βράδυ, το σύστημά μας συλλέγει τις τρέχουσες τιμές και τη διαθεσιμότητα από τους ιστότοπους των καταστημάτων και τις αντιστοιχίζει ανά προϊόν, ώστε να βλέπεις με μια ματιά πού είναι φθηνότερο αυτό που ψάχνεις.",
    ],
    stores: ["iStorm", "Kotsovolos", "Stephanis", "Electroline", "Public", "Bionic"],
    blocks: [
      {
        heading: "Είμαστε ουδέτεροι",
        body: "Δεν πληρωνόμαστε από κανένα κατάστημα και δεν λαμβάνουμε προμήθεια. Η σειρά εμφάνισης καθορίζεται μόνο από την τιμή και τη διαθεσιμότητα. Όταν βρεις αυτό που θέλεις, σε στέλνουμε απευθείας στο κατάστημα, και η αγορά γίνεται εκεί.",
      },
      {
        heading: "Ειδοποιήσεις τιμής",
        body: "Σε κάθε σελίδα προϊόντος μπορείς να ορίσεις τιμή στόχο. Όταν κάποιο κατάστημα φτάσει ή πέσει κάτω από αυτήν, σου στέλνουμε email. Μπορείς να απεγγραφείς οποιαδήποτε στιγμή με ένα κλικ.",
      },
      {
        heading: "Σημείωση για τις τιμές",
        body: "Οι τιμές ενημερώνονται καθημερινά αλλά μπορεί να αλλάξουν μέσα στη μέρα. Η τελική τιμή είναι πάντα αυτή του καταστήματος.",
      },
    ],
    outro: "Για ερωτήσεις ή παρατηρήσεις, γράψε μας στο contact@timicy.com.",
  },
  en: {
    title: "How TimiCY works",
    intro: [
      "TimiCY compares prices for electronics and home appliances from six stores in Cyprus (iStorm, Kotsovolos, Stephanis, Electroline, Public and Bionic) across 21 product categories.",
      "Every night, our system collects current prices and availability from the stores' websites and matches them per product, so you can see at a glance where the item you want is cheapest.",
    ],
    stores: ["iStorm", "Kotsovolos", "Stephanis", "Electroline", "Public", "Bionic"],
    blocks: [
      {
        heading: "We are neutral",
        body: "We are not paid by any store and we do not receive commission. The order in which offers appear is determined only by price and availability. When you find what you want, we send you directly to the store, and the purchase happens there.",
      },
      {
        heading: "Price alerts",
        body: "On every product page you can set a target price. When a store reaches or drops below it, we send you an email. You can unsubscribe at any time with a single click.",
      },
      {
        heading: "A note on prices",
        body: "Prices are updated daily but may change during the day. The final price is always the one shown by the store.",
      },
    ],
    outro: "Questions or feedback? Write to us at contact@timicy.com.",
  },
};

export default about;

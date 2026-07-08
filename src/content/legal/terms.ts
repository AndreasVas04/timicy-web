/**
 * Terms of use content for both locales.
 *
 * Reviewed by a human before launch: PENDING
 *
 * Structured as title, lastUpdated, and an array of sections (heading +
 * paragraphs). The page component reads the locale param and renders the
 * matching locale object. This keeps long legal copy out of the i18n JSON
 * files, which are better suited to short UI strings.
 */

import type { LegalPageContent } from "./privacy";

const terms: Record<string, LegalPageContent> = {
  el: {
    title: "Όροι Χρήσης",
    lastUpdated: "Τελευταία ενημέρωση: 8 Ιουλίου 2026",
    sections: [
      {
        heading: "Η υπηρεσία",
        paragraphs: [
          "Το TimiCY είναι μια δωρεάν υπηρεσία σύγκρισης τιμών. Συγκεντρώνουμε τιμές και διαθεσιμότητα προϊόντων από τους δημόσιους ιστότοπους καταστημάτων λιανικής της Κύπρου και τις παρουσιάζουμε συγκεντρωτικά. Οι τιμές ενημερώνονται σε νυχτερινή βάση.",
        ],
      },
      {
        heading: "Δεν είμαστε κατάστημα",
        paragraphs: [
          "Το TimiCY δεν πουλά προϊόντα, δεν μεσολαβεί σε αγορές και δεν συμμετέχει με κανέναν τρόπο στη συναλλαγή σου με το κατάστημα. Όταν επιλέγεις \u00ABΜετάβαση στο κατάστημα\u00BB, μεταφέρεσαι στον ιστότοπο του καταστήματος, όπου ισχύουν οι δικοί του όροι πώλησης.",
        ],
      },
      {
        heading: "Ακρίβεια τιμών",
        paragraphs: [
          "Καταβάλλουμε κάθε εύλογη προσπάθεια ώστε οι τιμές να είναι ακριβείς. Ωστόσο, οι τιμές και η διαθεσιμότητα αλλάζουν συνεχώς και ενδέχεται να διαφέρουν από αυτές που εμφανίζονται εδώ. Η τελική τιμή είναι πάντα αυτή που αναγράφεται στον ιστότοπο του καταστήματος τη στιγμή της αγοράς. Το TimiCY δεν φέρει ευθύνη για αποφάσεις αγοράς που βασίζονται στις πληροφορίες του ιστότοπου.",
        ],
      },
      {
        heading: "Ουδετερότητα",
        paragraphs: [
          "Το TimiCY δεν λαμβάνει προμήθεια από τα καταστήματα και δεν έχει εμπορικές συμφωνίες μαζί τους. Η σειρά εμφάνισης των προσφορών δεν επηρεάζεται από κανέναν εμπορικό παράγοντα και βασίζεται αποκλειστικά στην τιμή και τη διαθεσιμότητα. Εάν αυτό αλλάξει στο μέλλον, η παρούσα σελίδα θα ενημερωθεί πριν από οποιαδήποτε αλλαγή.",
        ],
      },
      {
        heading: "Πνευματική ιδιοκτησία",
        paragraphs: [
          "Οι ονομασίες προϊόντων, τα εμπορικά σήματα και οι εικόνες προϊόντων ανήκουν στους κατόχους τους και στα αντίστοιχα καταστήματα. Εμφανίζονται εδώ αποκλειστικά για σκοπούς ταυτοποίησης και σύγκρισης.",
        ],
      },
      {
        heading: "Περιορισμός ευθύνης",
        paragraphs: [
          "Η υπηρεσία παρέχεται \u00ABως έχει\u00BB, χωρίς εγγυήσεις διαθεσιμότητας ή πληρότητας. Στον μέγιστο βαθμό που επιτρέπει ο νόμος, δεν φέρουμε ευθύνη για ζημίες που απορρέουν από τη χρήση της υπηρεσίας.",
        ],
      },
      {
        heading: "Εφαρμοστέο δίκαιο",
        paragraphs: [
          "Οι παρόντες όροι διέπονται από το δίκαιο της Κυπριακής Δημοκρατίας.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Use",
    lastUpdated: "Last updated: 8 July 2026",
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "TimiCY is a free price comparison service. We collect product prices and availability from the public websites of retail stores in Cyprus and present them in one place. Prices are updated nightly.",
        ],
      },
      {
        heading: "We are not a store",
        paragraphs: [
          "TimiCY does not sell products, does not act as an intermediary in purchases, and does not participate in any way in your transaction with the store. When you select \u201CGo to store\u201D, you are taken to the store\u2019s website, where its own terms of sale apply.",
        ],
      },
      {
        heading: "Price accuracy",
        paragraphs: [
          "We make every reasonable effort to keep prices accurate. However, prices and availability change constantly and may differ from what is shown here. The final price is always the one displayed on the store\u2019s website at the time of purchase. TimiCY accepts no responsibility for purchasing decisions based on the information on this website.",
        ],
      },
      {
        heading: "Neutrality",
        paragraphs: [
          "TimiCY does not receive commission from the stores and has no commercial agreements with them. The order in which offers appear is not influenced by any commercial factor and is based solely on price and availability. If this changes in the future, this page will be updated before any change takes effect.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "Product names, trademarks and product images belong to their respective owners and stores. They appear here solely for identification and comparison purposes.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "The service is provided \u201Cas is\u201D, without guarantees of availability or completeness. To the maximum extent permitted by law, we accept no liability for damages arising from the use of the service.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by the law of the Republic of Cyprus.",
        ],
      },
    ],
  },
};

export default terms;

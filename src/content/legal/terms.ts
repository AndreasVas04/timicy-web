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
    lastUpdated: "Τελευταία ενημέρωση: 14 Ιουλίου 2026",
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
        heading: "Ακρίβεια πληροφοριών προϊόντων",
        paragraphs: [
          "Καταβάλλουμε κάθε εύλογη προσπάθεια ώστε οι πληροφορίες να είναι ακριβείς. Ωστόσο, οι τιμές και η διαθεσιμότητα αλλάζουν συνεχώς και ενδέχεται να διαφέρουν από αυτές που εμφανίζονται εδώ. Η τελική τιμή είναι πάντα αυτή που αναγράφεται στον ιστότοπο του καταστήματος τη στιγμή της αγοράς.",
          "Οι πληροφορίες προϊόντων συλλέγονται και αντιστοιχίζονται με αυτοματοποιημένα μέσα. Η αυτόματη αντιστοίχιση ενδέχεται περιστασιακά να είναι εσφαλμένη ή ελλιπής. Πριν από κάθε αγορά, επιβεβαίωσε τον ακριβή κωδικό μοντέλου, τα χαρακτηριστικά, την τιμή και τη διαθεσιμότητα στον ιστότοπο του καταστήματος. Μην βασίζεσαι αποκλειστικά στις πληροφορίες του TimiCY για να λάβεις απόφαση αγοράς.",
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
          "Οι ονομασίες προϊόντων, τα εμπορικά σήματα και οι εικόνες προϊόντων ανήκουν στους αντίστοιχους δικαιούχους τους, συμπεριλαμβανομένων κατασκευαστών, καταστημάτων και άλλων τρίτων. Εμφανίζονται εδώ αποκλειστικά για σκοπούς ταυτοποίησης και σύγκρισης. Η εμφάνισή τους δεν υποδηλώνει χορηγία, έγκριση ή οποιαδήποτε σχέση συνεργασίας με το TimiCY. Αν είσαι δικαιούχος και θέλεις να ζητήσεις διόρθωση, αναφορά προέλευσης ή αφαίρεση περιεχομένου, γράψε μας στο contact@timicy.com και θα εξετάσουμε το αίτημα άμεσα.",
        ],
      },
      {
        heading: "Περιορισμός ευθύνης",
        paragraphs: [
          "Η υπηρεσία παρέχεται \u00ABως έχει\u00BB, χωρίς εγγυήσεις διαθεσιμότητας, ακρίβειας ή πληρότητας. Στον μέγιστο βαθμό που επιτρέπει το εφαρμοστέο δίκαιο, δεν φέρουμε ευθύνη για ζημίες που απορρέουν από τη χρήση της υπηρεσίας, συμπεριλαμβανομένων ιδίως ζημιών από παρωχημένες, ελλιπείς ή εσφαλμένα αντιστοιχισμένες πληροφορίες, από αλλαγές που πραγματοποιούν τα καταστήματα μετά την τελευταία ενημέρωσή μας ή από προσωρινή μη διαθεσιμότητα της υπηρεσίας. Τίποτα στους παρόντες όρους δεν αποκλείει ή περιορίζει ευθύνη που δεν μπορεί νομίμως να αποκλειστεί ή να περιοριστεί.",
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
    lastUpdated: "Last updated: 14 July 2026",
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
        heading: "Accuracy of product information",
        paragraphs: [
          "We make every reasonable effort to keep the information accurate. However, prices and availability change constantly and may differ from what is shown here. The final price is always the one displayed on the store\u2019s website at the time of purchase.",
          "Product information is collected and matched by automated means. Automated product matching may occasionally be incorrect or incomplete. Before purchasing, verify the exact model number, specifications, price and availability on the store\u2019s website. Do not rely solely on information displayed by TimiCY when making a purchasing decision.",
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
          "Product names, trademarks and product images belong to their respective rights holders, including manufacturers, retailers and other third parties. They appear here solely for identification and comparison purposes. Their appearance does not imply sponsorship, endorsement or any affiliation with TimiCY. If you are a rights holder and wish to request a correction, attribution or removal of content, write to us at contact@timicy.com and we will review the request promptly.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "The service is provided \u201Cas is\u201D, without guarantees of availability, accuracy or completeness. To the maximum extent permitted by applicable law, we accept no liability for losses arising from the use of the service, including, in particular, losses arising from outdated, incomplete or incorrectly matched information, changes made by retailers after our latest update, or temporary unavailability of the service. Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited.",
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

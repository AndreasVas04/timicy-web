/**
 * Privacy policy content for both locales.
 *
 * Reviewed by a human before launch: PENDING
 *
 * Structured as title, lastUpdated, and an array of sections (heading +
 * paragraphs). The page component reads the locale param and renders the
 * matching locale object. This keeps long legal copy out of the i18n JSON
 * files, which are better suited to short UI strings.
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalPageContent {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const privacy: Record<string, LegalPageContent> = {
  el: {
    title: "Πολιτική Απορρήτου",
    lastUpdated: "Τελευταία ενημέρωση: 8 Ιουλίου 2026",
    sections: [
      {
        heading: "Ποιοι είμαστε",
        paragraphs: [
          "Το TimiCY (timicy.com) είναι μια δωρεάν υπηρεσία σύγκρισης τιμών ηλεκτρονικών και οικιακών συσκευών από καταστήματα της Κύπρου. Την υπηρεσία διαχειρίζεται ιδιώτης με έδρα την Κύπρο, ο οποίος ενεργεί ως υπεύθυνος επεξεργασίας των δεδομένων που περιγράφονται σε αυτή τη σελίδα. Μπορείς να επικοινωνήσεις μαζί μας στο contact@timicy.com.",
        ],
      },
      {
        heading: "Τι δεδομένα συλλέγουμε",
        paragraphs: [
          "Το TimiCY δεν απαιτεί λογαριασμό και δεν συλλέγει προσωπικά δεδομένα κατά την απλή περιήγηση. Προσωπικά δεδομένα συλλέγονται μόνο όταν δημιουργείς ειδοποίηση τιμής: η διεύθυνση email σου, η τιμή στόχος, το προϊόν που σε ενδιαφέρει και η γλώσσα προτίμησής σου. Επιπλέον, οι πάροχοι υποδομής μας επεξεργάζονται προσωρινά τεχνικά δεδομένα (όπως τη διεύθυνση IP) στον βαθμό που είναι απαραίτητα για τη λειτουργία και την ασφάλεια του ιστότοπου.",
        ],
      },
      {
        heading: "Γιατί τα συλλέγουμε και με ποια νομική βάση",
        paragraphs: [
          "Χρησιμοποιούμε το email σου αποκλειστικά για να σου στείλουμε την ειδοποίηση που ζήτησες, δηλαδή όταν η τιμή του προϊόντος πέσει στο επίπεδο που όρισες. Νομική βάση είναι η συγκατάθεσή σου, την οποία δίνεις με την υποβολή της φόρμας. Δεν στέλνουμε newsletter, διαφημίσεις ή άλλα μηνύματα, και δεν κοινοποιούμε το email σου σε τρίτους για δικούς τους σκοπούς.",
        ],
      },
      {
        heading: "Πού αποθηκεύονται και ποιοι τα επεξεργάζονται",
        paragraphs: [
          "Τα δεδομένα αποθηκεύονται σε βάση δεδομένων της Supabase, σε κέντρο δεδομένων στην Ιρλανδία, εντός Ευρωπαϊκής Ένωσης. Τα emails αποστέλλονται μέσω της υπηρεσίας Resend. Ο ιστότοπος φιλοξενείται στη Vercel. Οι πάροχοι αυτοί ενεργούν ως εκτελούντες την επεξεργασία για λογαριασμό μας.",
        ],
      },
      {
        heading: "Για πόσο τα κρατάμε",
        paragraphs: [
          "Τα στοιχεία της ειδοποίησής σου διατηρούνται μόνο όσο η ειδοποίηση παραμένει ενεργή. Κάθε email που λαμβάνεις περιέχει σύνδεσμο απεγγραφής. Με την απεγγραφή, τα στοιχεία σου διαγράφονται οριστικά από τη βάση μας.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Ο ιστότοπος χρησιμοποιεί ένα μόνο, αυστηρά λειτουργικό cookie (NEXT_LOCALE), το οποίο θυμάται τη γλώσσα που επέλεξες. Δεν χρησιμοποιούμε cookies παρακολούθησης, διαφημιστικά cookies ή εργαλεία analytics τρίτων. Για τον λόγο αυτό δεν εμφανίζουμε banner συγκατάθεσης. Αν αυτό αλλάξει στο μέλλον, η παρούσα πολιτική θα ενημερωθεί πριν από κάθε αλλαγή.",
        ],
      },
      {
        heading: "Τα δικαιώματά σου",
        paragraphs: [
          "Βάσει του Γενικού Κανονισμού Προστασίας Δεδομένων (GDPR), έχεις δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού και εναντίωσης στην επεξεργασία των δεδομένων σου, καθώς και δικαίωμα να ανακαλέσεις τη συγκατάθεσή σου ανά πάσα στιγμή, είτε μέσω του συνδέσμου απεγγραφής είτε με email στο contact@timicy.com. Έχεις επίσης δικαίωμα καταγγελίας στο Γραφείο Επιτρόπου Προστασίας Δεδομένων Προσωπικού Χαρακτήρα της Κύπρου (dataprotection.gov.cy).",
        ],
      },
      {
        heading: "Αλλαγές",
        paragraphs: [
          "Τυχόν ουσιώδεις αλλαγές στην πολιτική αυτή θα αποτυπώνονται σε αυτή τη σελίδα, με ενημέρωση της ημερομηνίας στην κορυφή.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: 8 July 2026",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "TimiCY (timicy.com) is a free price comparison service for electronics and home appliances from stores in Cyprus. The service is operated by a private individual based in Cyprus, who acts as the data controller for the data described on this page. You can reach us at contact@timicy.com.",
        ],
      },
      {
        heading: "What data we collect",
        paragraphs: [
          "TimiCY does not require an account and does not collect personal data during normal browsing. Personal data is collected only when you create a price alert: your email address, your target price, the product you are interested in, and your language preference. In addition, our infrastructure providers temporarily process technical data (such as your IP address) to the extent necessary for the operation and security of the website.",
        ],
      },
      {
        heading: "Why we collect it and on what legal basis",
        paragraphs: [
          "We use your email address exclusively to send you the alert you requested, that is, when the price of the product drops to the level you set. The legal basis is your consent, which you give by submitting the form. We do not send newsletters, advertisements or any other messages, and we do not share your email address with third parties for their own purposes.",
        ],
      },
      {
        heading: "Where it is stored and who processes it",
        paragraphs: [
          "Data is stored in a Supabase database located in a data centre in Ireland, within the European Union. Emails are sent through the Resend service. The website is hosted on Vercel. These providers act as data processors on our behalf.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Your alert details are kept only for as long as your alert remains active. Every email you receive contains an unsubscribe link. When you unsubscribe, your details are permanently deleted from our database.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "The website uses a single, strictly functional cookie (NEXT_LOCALE), which remembers the language you selected. We do not use tracking cookies, advertising cookies or third-party analytics tools. For this reason we do not display a consent banner. If this changes in the future, this policy will be updated before any change takes effect.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under the General Data Protection Regulation (GDPR), you have the right to access, rectify, erase, restrict and object to the processing of your data, as well as the right to withdraw your consent at any time, either through the unsubscribe link or by emailing contact@timicy.com. You also have the right to lodge a complaint with the Office of the Commissioner for Personal Data Protection of Cyprus (dataprotection.gov.cy).",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "Any material changes to this policy will be reflected on this page, with the date at the top updated accordingly.",
        ],
      },
    ],
  },
};

export default privacy;

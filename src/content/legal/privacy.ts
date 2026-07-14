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
    lastUpdated: "Τελευταία ενημέρωση: 14 Ιουλίου 2026",
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
          "Δεν χρειάζεται να δημιουργήσεις λογαριασμό για να χρησιμοποιήσεις το TimiCY. Κατά την απλή περιήγηση, οι πάροχοι υποδομής μας επεξεργάζονται, για λογαριασμό μας, περιορισμένα τεχνικά δεδομένα, όπως τη διεύθυνση IP και βασικές πληροφορίες αιτήματος, στον βαθμό που είναι απαραίτητα για τη λειτουργία και την ασφάλεια του ιστότοπου. Όταν δημιουργείς ειδοποίηση τιμής, συλλέγουμε τη διεύθυνση email σου, την τιμή στόχο, το προϊόν που σε ενδιαφέρει και τη γλώσσα προτίμησής σου. Δεν χρησιμοποιούμε τα δεδομένα αυτά για διαφήμιση ή κατάρτιση προφίλ.",
        ],
      },
      {
        heading: "Γιατί τα συλλέγουμε και με ποια νομική βάση",
        paragraphs: [
          "Χρησιμοποιούμε το email σου αποκλειστικά για να σου στείλουμε την ειδοποίηση που ζήτησες, δηλαδή όταν η τιμή του προϊόντος πέσει στο επίπεδο που όρισες. Νομική βάση είναι η συγκατάθεσή σου, την οποία δίνεις με την υποβολή της φόρμας. Δεν στέλνουμε newsletter, διαφημίσεις ή άλλα μηνύματα, και δεν κοινοποιούμε το email σου σε τρίτους για δικούς τους σκοπούς.",
          "Τα τεχνικά δεδομένα που περιγράφονται παραπάνω υποβάλλονται σε επεξεργασία με βάση το έννομο συμφέρον μας να λειτουργεί ο ιστότοπος με ασφάλεια και αξιοπιστία, ιδίως για την αντιμετώπιση τεχνικών προβλημάτων και την προστασία από κατάχρηση. Η επεξεργασία αυτή περιορίζεται στα απολύτως απαραίτητα και δεν χρησιμοποιείται για διαφήμιση ή κατάρτιση προφίλ.",
        ],
      },
      {
        heading: "Πού αποθηκεύονται και ποιοι τα επεξεργάζονται",
        paragraphs: [
          "Τα δεδομένα αποθηκεύονται σε βάση δεδομένων της Supabase, σε κέντρο δεδομένων στην Ιρλανδία, εντός Ευρωπαϊκής Ένωσης. Τα emails αποστέλλονται μέσω της υπηρεσίας Resend. Ο ιστότοπος φιλοξενείται στη Vercel. Οι πάροχοι αυτοί ενεργούν ως εκτελούντες την επεξεργασία για λογαριασμό μας.",
        ],
      },
      {
        heading: "Διεθνείς διαβιβάσεις",
        paragraphs: [
          "Η βάση δεδομένων μας βρίσκεται σε κέντρο δεδομένων στην Ιρλανδία, εντός Ευρωπαϊκής Ένωσης. Ορισμένοι από τους παρόχους μας εδρεύουν στις Ηνωμένες Πολιτείες, και η επεξεργασία ορισμένων δεδομένων (όπως κατά την αποστολή email ή τη φιλοξενία του ιστότοπου) ενδέχεται να περιλαμβάνει διαβίβαση εκτός του Ευρωπαϊκού Οικονομικού Χώρου. Στις περιπτώσεις αυτές, η διαβίβαση βασίζεται σε μηχανισμούς που προβλέπει ο GDPR, όπως αποφάσεις επάρκειας της Ευρωπαϊκής Επιτροπής ή τυποποιημένες συμβατικές ρήτρες, σύμφωνα με τους όρους επεξεργασίας κάθε παρόχου. Μπορείς να ζητήσεις περισσότερες πληροφορίες σχετικά με τις εγγυήσεις που εφαρμόζονται στις διεθνείς διαβιβάσεις επικοινωνώντας μαζί μας στο contact@timicy.com.",
        ],
      },
      {
        heading: "Για πόσο τα κρατάμε",
        paragraphs: [
          "Τα στοιχεία της ειδοποίησής σου διατηρούνται μόνο όσο η ειδοποίηση παραμένει ενεργή. Κάθε email που λαμβάνεις περιέχει σύνδεσμο απεγγραφής. Με την απεγγραφή, τα στοιχεία σου διαγράφονται από την ενεργή βάση δεδομένων μας. Υπολειμματικά αντίγραφα ενδέχεται να παραμένουν για περιορισμένο διάστημα σε αντίγραφα ασφαλείας και τεχνικά αρχεία καταγραφής, μέχρι να διαγραφούν και αυτά σύμφωνα με τους κύκλους διατήρησης των παρόχων μας.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Ο ιστότοπος χρησιμοποιεί ένα μόνο, αυστηρά λειτουργικό cookie (NEXT_LOCALE), το οποίο αποθηκεύει τη γλώσσα που επέλεξες. Χρησιμοποιεί επίσης περιορισμένη προσωρινή αποθήκευση στον browser σου αποκλειστικά για τεχνικούς σκοπούς πλοήγησης, η οποία περιορίζεται στην τρέχουσα συνεδρία περιήγησης. Πρόκειται για αυστηρά απαραίτητες λειτουργίες και για τον λόγο αυτό δεν εμφανίζουμε banner συγκατάθεσης. Δεν χρησιμοποιούμε cookies παρακολούθησης, διαφημιστικά cookies, εργαλεία analytics τρίτων ή άλλες παρόμοιες τεχνολογίες για σκοπούς παρακολούθησης. Αν αυτό αλλάξει στο μέλλον, η παρούσα πολιτική θα ενημερωθεί πριν από κάθε αλλαγή.",
        ],
      },
      {
        heading: "Τα δικαιώματά σου",
        paragraphs: [
          "Βάσει του Γενικού Κανονισμού Προστασίας Δεδομένων (GDPR), έχεις δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού της επεξεργασίας, εναντίωσης και φορητότητας των δεδομένων σου, υπό τις προϋποθέσεις και εξαιρέσεις που προβλέπει ο νόμος. Έχεις επίσης δικαίωμα να ανακαλέσεις τη συγκατάθεσή σου ανά πάσα στιγμή, είτε μέσω του συνδέσμου απεγγραφής είτε με email στο contact@timicy.com, μέσω του οποίου μπορείς να ασκήσεις και οποιοδήποτε από τα παραπάνω δικαιώματα. Η ανάκληση δεν επηρεάζει τη νομιμότητα της επεξεργασίας που έγινε πριν από αυτήν. Αν θεωρείς ότι η επεξεργασία παραβιάζει τον νόμο, έχεις δικαίωμα καταγγελίας στο Γραφείο Επιτρόπου Προστασίας Δεδομένων Προσωπικού Χαρακτήρα της Κύπρου (dataprotection.gov.cy).",
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
    lastUpdated: "Last updated: 14 July 2026",
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
          "You do not need to create an account to use TimiCY. During normal browsing, our infrastructure providers process limited technical data on our behalf, such as your IP address and basic request information, to the extent necessary for the operation and security of the website. When you create a price alert, we collect your email address, target price, the product you are interested in and your language preference. We do not use this data for advertising or profiling.",
        ],
      },
      {
        heading: "Why we collect it and on what legal basis",
        paragraphs: [
          "We use your email address exclusively to send you the alert you requested, that is, when the price of the product drops to the level you set. The legal basis is your consent, which you give by submitting the form. We do not send newsletters, advertisements or any other messages, and we do not share your email address with third parties for their own purposes.",
          "The technical data described above is processed on the basis of our legitimate interest in operating the website securely and reliably, in particular for resolving technical issues and protecting against abuse. This processing is limited to what is strictly necessary and is not used for advertising or profiling.",
        ],
      },
      {
        heading: "Where it is stored and who processes it",
        paragraphs: [
          "Data is stored in a Supabase database located in a data centre in Ireland, within the European Union. Emails are sent through the Resend service. The website is hosted on Vercel. These providers act as data processors on our behalf.",
        ],
      },
      {
        heading: "International transfers",
        paragraphs: [
          "Our database is located in a data centre in Ireland, within the European Union. Some of our providers are based in the United States, and the processing of certain data (such as when sending emails or hosting the website) may involve a transfer outside the European Economic Area. In such cases, the transfer is based on mechanisms provided for by the GDPR, such as adequacy decisions of the European Commission or standard contractual clauses, in accordance with each provider\u2019s processing terms. You may request further information about the safeguards applicable to international transfers by contacting us at contact@timicy.com.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Your alert details are kept only for as long as your alert remains active. Every email you receive contains an unsubscribe link. When you unsubscribe, your details are deleted from our active database. Residual copies may remain for a limited period in backups and technical logs, until they too are deleted in line with our providers\u2019 retention cycles.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "The website uses a single, strictly functional cookie (NEXT_LOCALE), which stores the language you selected. It also uses limited temporary storage in your browser solely for technical navigation purposes, which is limited to the current browsing session. These are strictly necessary functions, and for this reason we do not display a consent banner. We do not use tracking cookies, advertising cookies, third-party analytics tools or other similar technologies for tracking purposes. If this changes in the future, this policy will be updated before any change takes effect.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under the General Data Protection Regulation (GDPR), you have the right to access, rectify or erase your personal data, restrict or object to its processing, and exercise your right to data portability, subject to the conditions and exceptions provided by law. You may withdraw your consent at any time through the unsubscribe link or by emailing contact@timicy.com. You may also use that email address to exercise any of the rights described above. Withdrawal does not affect the lawfulness of processing carried out before it. If you believe that the processing of your personal data infringes the law, you have the right to lodge a complaint with the Office of the Commissioner for Personal Data Protection of Cyprus (dataprotection.gov.cy).",
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

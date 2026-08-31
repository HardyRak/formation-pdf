import type { Formation, IconName, Level, TrainingDocument, PdfPage, PdfBlock } from '../../models';

/** ---------------------------------------------------------------
 * Jeu de données servi par l'API (miroir des entités NestJS).
 * Le contenu des pages n'est jamais exposé en URL publique : il est
 * sérialisé page par page par le contrôleur `documents/:id/pages/:n`.
 * ---------------------------------------------------------------*/

interface Section {
  title: string;
  body: string;
  bullets: string[];
  tip?: string;
  quote?: string;
}

interface DocSeed {
  id: string;
  title: string;
  description: string;
  sections: Section[];
}

const s = (title: string, body: string, bullets: string[], tip?: string, quote?: string): Section => ({
  title,
  body,
  bullets,
  tip,
  quote,
});

const d = (id: string, title: string, description: string, sections: Section[]): DocSeed => ({
  id,
  title,
  description,
  sections,
});

interface LevelSeed {
  id: string;
  name: string;
  description: string;
  documents: DocSeed[];
}

interface FormationSeed {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: IconName;
  color: string;
  mandatory: boolean;
  levels: LevelSeed[];
}

export const SEED: FormationSeed[] = [
  {
    id: 'f-angular',
    name: 'Angular & Ionic Mobile',
    description: "Concevoir des applications mobiles hybrides performantes avec Angular, Ionic et une architecture par signaux.",
    category: 'Développement',
    icon: 'phone-portrait',
    color: '#4F46E5',
    mandatory: false,
    levels: [
      {
        id: 'l-ang-1',
        name: 'Niveau 1 — Fondamentaux',
        description: "Composants autonomes, signaux et routage : les briques de base d'une application moderne.",
        documents: [
          d('doc-ang-101', 'Composants autonomes et Signals', "Le nouveau modèle de composition d'Angular sans NgModule.", [
            s(
              'Le composant autonome',
              "Un composant autonome déclare lui-même ses dépendances via la propriété imports. Il supprime la couche NgModule, simplifie le lazy loading et rend chaque écran testable de manière isolée. C'est aujourd'hui le mode de déclaration recommandé pour tout nouveau projet.",
              [
                'standalone: true est implicite depuis les dernières versions',
                'Les imports sont déclarés au plus près du besoin',
                'Chargement paresseux route par route avec loadComponent',
              ],
              "Migrez progressivement : un NgModule peut importer un composant autonome, et l'inverse est vrai.",
            ),
            s(
              'Signals : état réactif granulaire',
              "Un signal est une valeur observable synchrone. Toute lecture d'un signal dans un template enregistre une dépendance fine : seule la portion concernée du DOM est mise à jour, sans zone.js ni vérification globale.",
              [
                'signal() crée une source de vérité mutable',
                'computed() dérive une valeur mémorisée',
                'effect() exécute un effet de bord à chaque changement',
              ],
              "Ne mettez jamais d'appel HTTP dans un computed : réservez-le aux dérivations pures.",
            ),
            s(
              'La syntaxe de flux moderne',
              "Le bloc @if remplace *ngIf et @for remplace *ngFor. Le compilateur produit un code plus petit et plus rapide, et la piste track devient obligatoire, ce qui élimine une classe entière de bugs de rendu de liste.",
              [
                '@if (user()) { … } @else { … }',
                '@for (item of items(); track item.id) { … } @empty { … }',
                '@switch / @case pour les états multiples',
              ],
              "Le bloc @empty affiche l'état vide sans condition supplémentaire.",
            ),
            s(
              'inject() plutôt que le constructeur',
              "La fonction inject() récupère une dépendance dans un contexte d'injection. Elle allège les constructeurs, facilite l'écriture de fonctions utilitaires réutilisables et fonctionne aussi dans les gardes et intercepteurs fonctionnels.",
              [
                'private readonly api = inject(FormationApi);',
                'Utilisable dans les field initializers et les factories',
                'Compatible avec les gardes fonctionnels canActivate',
              ],
            ),
            s(
              'Bonnes pratiques de découpage',
              "Un composant de page orchestre, un composant de présentation affiche. Les composants de présentation ne connaissent ni le store ni le HTTP : ils reçoivent des entrées et émettent des sorties, ce qui les rend triviaux à tester.",
              [
                'Pages : orchestration + accès au store',
                'Composants UI : input() / output() uniquement',
                'ChangeDetectionStrategy.OnPush partout',
              ],
              'Un composant de présentation sans dépendance se teste en moins de dix lignes.',
            ),
          ]),
          d('doc-ang-102', 'Angular Router pour le mobile', "Navigation, routes protégées et transitions natives avec Ionic Router.", [
            s(
              'Arborescence de routes',
              "Le parcours formation → niveau → document → lecteur se traduit directement en routes imbriquées. Chaque segment porte un identifiant, ce qui rend chaque écran adressable et restaurable après un redémarrage à froid.",
              [
                '/formations',
                '/formations/:formationId/levels',
                '/levels/:levelId/documents',
                '/documents/:documentId/reader',
              ],
              "Préférez les identifiants aux index : un réordonnancement côté backend ne cassera pas les liens.",
            ),
            s(
              'Gardes et routes protégées',
              "Un garde fonctionnel lit l'état d'authentification et redirige vers /login en conservant l'URL demandée. Après connexion, l'utilisateur reprend exactement là où il avait été interrompu.",
              [
                'canActivate: [authGuard] sur les routes privées',
                'returnUrl mémorisée dans les queryParams',
                'Redirection automatique si le jeton est expiré',
              ],
            ),
            s(
              'Transitions et pile de navigation',
              "Ionic conserve une pile d'écrans : l'écran précédent reste monté pendant l'animation, ce qui donne une sensation native. Le bouton retour matériel Android est câblé sur la même pile.",
              [
                'Animation poussée / retirée selon le sens',
                'Préservation du scroll à la remontée',
                'defaultHref pour un retour fiable en deep link',
              ],
              "Testez toujours l'entrée directe par deep link : c'est le scénario le plus souvent oublié.",
            ),
            s(
              'Préchargement intelligent',
              "Sur mobile, la latence réseau domine. Précharger les données du niveau suivant pendant la lecture évite un écran de chargement au moment où l'utilisateur avance dans son parcours.",
              [
                'Resolvers pour les données critiques',
                'Préchargement en arrière-plan des niveaux visibles',
                'Cache mémoire invalidé à la déconnexion',
              ],
            ),
          ]),
        ],
      },
      {
        id: 'l-ang-2',
        name: 'Niveau 2 — Interface Ionic',
        description: 'Composants, ergonomie tactile et responsive design pour smartphone.',
        documents: [
          d('doc-ang-201', 'Composants Ionic essentiels', 'Listes, cartes, modales et bonnes pratiques UI mobile.', [
            s(
              'Le système de composants',
              "Ionic fournit des composants qui adoptent automatiquement les codes visuels de la plateforme hôte. Le même code produit une barre de navigation iOS centrée et une barre Material alignée à gauche.",
              ['ion-header / ion-content / ion-footer', 'ion-list et ion-item-sliding', 'ion-modal et ion-sheet'],
              "Laissez le composant gérer les zones sûres : ne codez jamais un padding fixe pour l'encoche.",
            ),
            s(
              'Listes performantes',
              "Au-delà de cinquante éléments, la virtualisation devient indispensable. Elle ne monte que les éléments visibles et recycle les vues, ce qui divise par dix la consommation mémoire sur les longues listes de documents.",
              ['Virtual scroll pour les catalogues', 'Skeleton pendant le chargement', 'Pull-to-refresh natif'],
            ),
            s(
              'Ergonomie tactile',
              "Une cible tactile mesure au minimum quarante-quatre points. Les actions destructives doivent être éloignées des zones de pouce, et toute action doit produire un retour visuel immédiat.",
              ['44 pt minimum par cible', 'Retour haptique sur les actions clés', 'Zone de pouce priorité basse'],
              "Testez l'application à une main : la majorité des usages en mobilité se font ainsi.",
            ),
            s(
              'États de l’interface',
              "Quatre états doivent être dessinés pour chaque écran de données : chargement, succès, vide et erreur. L'état vide est une opportunité pédagogique, pas un cul-de-sac.",
              ['Loading : squelettes plutôt que spinner plein écran', 'Empty : message + action', 'Error : cause + bouton Réessayer'],
            ),
          ]),
          d('doc-ang-202', 'Responsive et accessibilité', "Adapter l'interface à toutes les tailles d'écran et à tous les usages.", [
            s(
              'Grille fluide',
              "Une grille à douze colonnes permet de passer d'une colonne sur téléphone à deux ou trois sur tablette sans dupliquer le balisage. Les points de rupture doivent dépendre du contenu, pas des modèles d'appareils.",
              ['Mobile first, puis élargissement', 'Points de rupture fondés sur le contenu', 'Images en ratio fixe pour éviter les sauts'],
            ),
            s(
              'Typographie lisible',
              "Le corps de texte ne descend jamais sous seize points sur mobile. La hauteur de ligne généreuse améliore la vitesse de lecture des documents longs, notamment dans le lecteur PDF.",
              ['16 pt minimum pour le corps', 'Interligne 1,5 pour les paragraphes', 'Contraste AA : 4,5:1 minimum'],
              "Respectez la taille de police système : c'est le premier réglage d'accessibilité activé par les utilisateurs.",
            ),
            s(
              'Mode sombre',
              "Le mode sombre n'est pas une inversion de couleurs. Les surfaces s'éclairent avec l'élévation, les couleurs vives sont désaturées et le blanc pur est proscrit pour éviter l'éblouissement.",
              ['Surfaces élevées = plus claires', 'Accents désaturés', 'Jamais de #000 ni de #FFF purs'],
            ),
            s(
              'Accessibilité au quotidien',
              "Chaque contrôle porte un libellé explicite pour le lecteur d'écran. Les changements d'état sont annoncés, et aucune information n'est transmise uniquement par la couleur.",
              ['Libellés ARIA sur les icônes seules', 'Ordre de focus logique', 'Support de la réduction de mouvement'],
            ),
          ]),
        ],
      },
      {
        id: 'l-ang-3',
        name: 'Niveau 3 — Architecture & production',
        description: "État applicatif, sécurité des jetons et préparation à la mise en production.",
        documents: [
          d('doc-ang-301', 'SignalStore et gestion d’état', "Structurer l'état applicatif avec des stores par domaine.", [
            s(
              'Un store par domaine',
              "AuthStore, FormationStore, LevelStore, DocumentStore, PdfReaderStore et ProgressionStore : chaque store possède un périmètre clair et une seule responsabilité. Aucun composant ne parle directement au HTTP.",
              ['État = données + statut + erreur', 'Méthodes asynchrones dans le store', 'Composants purement déclaratifs'],
              'Un store qui dépasse trois cents lignes doit être scindé.',
            ),
            s(
              'Le triptyque loading / success / error',
              "Modéliser explicitement le statut évite les états impossibles, comme un spinner affiché en même temps qu'un message d'erreur. L'interface devient une fonction pure du statut.",
              ["status: 'idle' | 'loading' | 'success' | 'error'", 'error typée avec code et message', 'Rechargement idempotent'],
            ),
            s(
              'Sélecteurs dérivés',
              "La progression d'un niveau se calcule à partir de celle de ses documents, et celle d'une formation à partir de ses niveaux. Ces valeurs ne sont jamais stockées en double : elles sont dérivées à la volée.",
              ['Une seule source de vérité', 'computed() mémorisé', 'Zéro désynchronisation possible'],
            ),
            s(
              'Persistance locale',
              "La progression est écrite localement puis synchronisée. En cas de coupure réseau, la lecture continue et la file d'attente est rejouée au retour de la connectivité.",
              ['Écriture optimiste', "File d'attente de synchronisation", 'Résolution par horodatage'],
              "Une application de formation doit rester utilisable dans le métro : concevez hors ligne d'abord.",
            ),
          ]),
          d('doc-ang-302', 'Sécurité JWT et intercepteurs', 'Authentification, session expirée et accès protégé aux PDF.', [
            s(
              'Cycle de vie du jeton',
              "Le backend NestJS délivre un jeton d'accès court et un jeton de rafraîchissement long. Le premier est envoyé à chaque requête, le second sert uniquement à obtenir un nouveau jeton d'accès.",
              ['Access token : quelques minutes', 'Refresh token : plusieurs jours', 'Stockage en Keychain / Keystore'],
              "Ne stockez jamais un jeton dans le localStorage d'une WebView non isolée.",
            ),
            s(
              'Intercepteur HTTP',
              "L'intercepteur ajoute l'en-tête Authorization, mesure la latence et centralise le traitement des erreurs. Sur une réponse 401, il tente un rafraîchissement unique puis rejoue la requête d'origine.",
              ['Ajout automatique du Bearer', 'Rafraîchissement unique mutualisé', 'Déconnexion propre si l’échec persiste'],
            ),
            s(
              'Servir un PDF sans URL publique',
              "Le document n'est jamais accessible par une URL devinable. Le client demande le flux authentifié, le reçoit en mémoire et l'affiche : aucune écriture disque, aucun bouton de téléchargement, aucun partage.",
              ['Flux binaire authentifié page par page', 'Aucune mise en cache disque', 'Interface de lecture sans export'],
              "Journalisez les accès : la traçabilité est souvent exigée pour les formations réglementaires.",
            ),
            s(
              'Session expirée',
              "Quand la session expire, l'utilisateur doit être prévenu clairement et ramené à l'écran de connexion sans perdre sa position de lecture, qui est restaurée après ré-authentification.",
              ['Message explicite, non technique', 'Position de lecture conservée', 'Retour automatique à la page en cours'],
            ),
          ]),
        ],
      },
    ],
  },
  {
    id: 'f-hse',
    name: 'Sécurité au travail',
    description: 'Formation réglementaire annuelle : prévention des risques, gestes et postures, conduite à tenir en cas d’urgence.',
    category: 'HSE',
    icon: 'shield-checkmark',
    color: '#0EA5A4',
    mandatory: true,
    levels: [
      {
        id: 'l-hse-1',
        name: 'Niveau 1 — Prévention',
        description: 'Identifier les risques et appliquer les mesures de protection adaptées.',
        documents: [
          d('doc-hse-101', 'Prévention des risques professionnels', "Évaluation, hiérarchie des mesures et document unique.", [
            s(
              'Danger, risque, dommage',
              "Le danger est la propriété intrinsèque d'un élément de causer un dommage. Le risque est la probabilité que ce dommage survienne dans une situation donnée. Confondre les deux conduit à des plans d'action inefficaces.",
              ['Danger : le produit chimique lui-même', "Risque : l'exposition sans protection", 'Dommage : la brûlure constatée'],
              "Une situation dangereuse sans exposition ne génère pas de risque : agissez d'abord sur l'exposition.",
            ),
            s(
              'Les neuf principes de prévention',
              "La loi fixe une hiérarchie : éviter, évaluer, combattre à la source, adapter le travail à l'homme. La protection individuelle n'intervient qu'en dernier recours, une fois les autres mesures épuisées.",
              ['1. Éviter les risques', '2. Évaluer ceux qui ne peuvent être évités', '3. Combattre le risque à la source', '9. Donner les instructions appropriées'],
            ),
            s(
              'Le document unique',
              "Le DUERP recense les risques par unité de travail et pilote le plan d'action annuel. Il est mis à jour au moins une fois par an et à chaque changement significatif d'organisation.",
              ['Mise à jour annuelle obligatoire', 'Accessible aux salariés', 'Plan d’action priérisé et daté'],
            ),
            s(
              'Signaler une situation dangereuse',
              "Tout salarié peut et doit signaler une situation dangereuse. Le droit de retrait s'exerce face à un danger grave et imminent, sans sanction possible dès lors qu'il est exercé de bonne foi.",
              ['Signalement immédiat au responsable', 'Consignation au registre', "Droit d'alerte et de retrait"],
              "Un presqu'accident signalé aujourd'hui évite un accident demain.",
            ),
          ]),
          d('doc-hse-102', 'Les équipements de protection individuelle', 'Choisir, porter, contrôler et entretenir ses EPI.', [
            s(
              'Quand l’EPI devient nécessaire',
              "L'EPI complète les protections collectives lorsque le risque résiduel ne peut être supprimé. Il est fourni gratuitement par l'employeur et son port est obligatoire dans les zones signalées.",
              ['Après les protections collectives', "Fourni et entretenu par l'employeur", 'Port obligatoire en zone signalée'],
            ),
            s(
              'Les familles d’équipements',
              "Chaque partie du corps exposée dispose d'une protection normalisée. Le marquage CE et la norme applicable doivent être vérifiés avant toute mise à disposition.",
              ['Tête : casque EN 397', 'Yeux : lunettes EN 166', 'Audition : bouchons ou casque EN 352', 'Mains : gants adaptés au risque'],
              'Un gant anti-coupure ne protège pas du risque chimique : vérifiez toujours la norme.',
            ),
            s(
              'Contrôle avant usage',
              "Un équipement dégradé donne un faux sentiment de sécurité. Le contrôle visuel avant chaque prise de poste prend trente secondes et conditionne l'efficacité réelle de la protection.",
              ['Vérifier fissures, usure, date de péremption', 'Remplacer immédiatement si doute', 'Nettoyer et ranger après usage'],
            ),
          ]),
        ],
      },
      {
        id: 'l-hse-2',
        name: 'Niveau 2 — Gestes et situations à risque',
        description: 'Manutention, postures de travail et risque incendie.',
        documents: [
          d('doc-hse-201', 'Gestes et postures', 'Prévenir les troubles musculo-squelettiques au quotidien.', [
            s(
              'Comprendre les TMS',
              "Les troubles musculo-squelettiques représentent la première cause de maladie professionnelle reconnue. Ils résultent de la répétition, de la force et des postures contraignantes cumulées dans le temps.",
              ['Répétitivité des gestes', 'Efforts excessifs', 'Postures maintenues'],
            ),
            s(
              'Le port de charge',
              "Le dos reste droit, les jambes fournissent l'effort, la charge est maintenue près du corps. Le pivotement du buste chargé est le geste le plus traumatisant : déplacez les pieds plutôt que de tourner le tronc.",
              ['Pieds écartés, charge entre les jambes', 'Dos droit, gainage abdominal', 'Jamais de rotation du buste chargé'],
              'Au-delà de vingt-cinq kilos, utilisez une aide mécanique ou travaillez à deux.',
            ),
            s(
              'Poste de travail assis',
              "Écran à hauteur des yeux, avant-bras horizontaux, pieds à plat. La meilleure posture reste celle qui change : une micro-pause toutes les heures vaut mieux qu'un réglage parfait immobile.",
              ['Écran à une longueur de bras', 'Avant-bras à 90 degrés', 'Pause active toutes les heures'],
            ),
          ]),
          d('doc-hse-202', 'Risque incendie', 'Triangle du feu, moyens d’extinction et évacuation.', [
            s(
              'Le triangle du feu',
              "Trois éléments sont nécessaires à la combustion : un combustible, un comburant et une énergie d'activation. Supprimer l'un des trois éteint le feu ; c'est le principe de tous les extincteurs.",
              ['Combustible : ce qui brûle', "Comburant : l'oxygène de l'air", "Énergie : étincelle, chaleur"],
            ),
            s(
              'Choisir le bon extincteur',
              "Un extincteur inadapté aggrave le sinistre. L'eau sur un feu électrique ou sur une friture provoque une propagation immédiate et un risque grave pour l'opérateur.",
              ['Classe A : solides → eau pulvérisée', 'Classe B : liquides → mousse ou CO2', "Classe électrique → CO2 exclusivement"],
              "N'attaquez un départ de feu que si vous êtes formé et que la sortie reste dans votre dos.",
            ),
            s(
              'Évacuation',
              "À l'alarme, l'évacuation est immédiate et sans retour en arrière. Les ascenseurs sont interdits, les portes coupe-feu sont refermées, et le rassemblement se fait au point prévu pour permettre le comptage.",
              ['Alerter, évacuer, se rassembler', 'Jamais d’ascenseur', 'Comptage au point de rassemblement'],
            ),
          ]),
        ],
      },
      {
        id: 'l-hse-3',
        name: 'Niveau 3 — Urgences',
        description: 'Alerter, protéger et secourir en attendant les secours.',
        documents: [
          d('doc-hse-301', 'Premiers secours en entreprise', 'La chaîne de survie et les gestes qui sauvent.', [
            s(
              'Protéger, alerter, secourir',
              "L'ordre n'est pas négociable. Se précipiter sur une victime sans avoir supprimé le danger transforme un accident en accident multiple, scénario fréquent en milieu industriel.",
              ['1. Protéger la zone et soi-même', '2. Alerter le 15, 18 ou 112', '3. Secourir dans la limite de sa formation'],
            ),
            s(
              'Passer une alerte efficace',
              "Le message doit être structuré : qui appelle, où, ce qui s'est passé, l'état de la victime. On ne raccroche jamais le premier : le régulateur guide les gestes à accomplir.",
              ['Localisation précise avec point de rendez-vous', 'Nombre et état des victimes', 'Ne jamais raccrocher en premier'],
              'Préparez l’adresse exacte du site avant d’appeler : chaque seconde compte.',
            ),
            s(
              'Arrêt cardiaque',
              "Face à une personne inconsciente qui ne respire pas, le massage cardiaque doit débuter immédiatement : cent à cent vingt compressions par minute, cinq à six centimètres de profondeur, sans interruption jusqu'à l'arrivée du défibrillateur.",
              ['100 à 120 compressions par minute', 'Relais toutes les deux minutes', 'DAE dès que disponible'],
            ),
            s(
              'Hémorragie et brûlure',
              "Une hémorragie externe se comprime directement avec la main protégée. Une brûlure se refroidit à l'eau tempérée pendant au moins quinze minutes, sans jamais retirer les vêtements collés à la peau.",
              ['Compression directe et continue', 'Brûlure : eau 15 °C pendant 15 minutes', 'Ne jamais percer une cloque'],
            ),
          ]),
        ],
      },
    ],
  },
  {
    id: 'f-cyber',
    name: 'Cybersécurité & RGPD',
    description: 'Hygiène numérique, détection du phishing et protection des données personnelles au quotidien.',
    category: 'Conformité',
    icon: 'lock-closed',
    color: '#DB2777',
    mandatory: true,
    levels: [
      {
        id: 'l-cyb-1',
        name: 'Niveau 1 — Hygiène numérique',
        description: 'Les réflexes de base pour protéger ses accès et son poste.',
        documents: [
          d('doc-cyb-101', 'Mots de passe et authentification', 'Construire, stocker et renforcer ses secrets.', [
            s(
              'Longueur avant complexité',
              "Une phrase de passe longue résiste mieux qu'un mot court truffé de caractères spéciaux. Les attaques par dictionnaire ciblent les substitutions prévisibles, largement répertoriées.",
              ['Douze caractères minimum, seize recommandés', 'Une phrase mémorisable vaut mieux', 'Jamais de réutilisation entre services'],
              "P4ssw0rd! est cassé en quelques secondes : la substitution de caractères n'apporte rien.",
            ),
            s(
              'Double facteur',
              "Le second facteur bloque la quasi-totalité des attaques par vol d'identifiants. L'application d'authentification est préférable au SMS, vulnérable à l'échange de carte SIM.",
              ['Application TOTP recommandée', 'Clé physique pour les comptes sensibles', 'SMS en dernier recours'],
            ),
            s(
              'Gestionnaire de mots de passe',
              "Il génère, stocke et remplit des secrets uniques par service. Le risque résiduel se concentre sur le mot de passe maître, qui doit être long et protégé par un second facteur.",
              ['Un secret unique par service', 'Coffre chiffré de bout en bout', 'Mot de passe maître + 2FA'],
            ),
          ]),
          d('doc-cyb-102', 'Phishing et ingénierie sociale', 'Repérer, ne pas cliquer, signaler.', [
            s(
              'Les signaux d’alerte',
              "L'urgence, la peur et l'autorité sont les trois leviers du hameçonnage. Un message qui presse, menace ou invoque un dirigeant mérite une vérification par un canal indépendant.",
              ['Urgence artificielle', 'Expéditeur proche mais inexact', 'Lien dont le domaine ne correspond pas'],
              'Survolez le lien avant de cliquer : le domaine réel se lit toujours à gauche du premier slash.',
            ),
            s(
              'Fraude au président et au fournisseur',
              "Ces fraudes combinent recherche publique et pression hiérarchique pour obtenir un virement exceptionnel. Toute demande de changement de RIB doit être validée par un appel au numéro connu, jamais celui du courriel.",
              ['Double validation des virements', 'Rappel sur numéro déjà connu', 'Aucune exception, même en urgence'],
            ),
            s(
              'Réagir après un clic',
              "Un clic malencontreux n'est pas une faute : le taire en est une. La déconnexion réseau immédiate et le signalement limitent considérablement la propagation.",
              ['Déconnecter du réseau', 'Ne pas éteindre la machine', 'Signaler immédiatement au support'],
            ),
          ]),
        ],
      },
      {
        id: 'l-cyb-2',
        name: 'Niveau 2 — Données personnelles',
        description: 'Principes du RGPD et gestion des incidents de sécurité.',
        documents: [
          d('doc-cyb-201', 'RGPD — principes essentiels', 'Licité, minimisation, durée de conservation et droits.', [
            s(
              'Donnée personnelle et traitement',
              "Toute information se rapportant à une personne identifiée ou identifiable est une donnée personnelle, y compris un identifiant technique ou une adresse IP. Le traitement couvre la collecte comme la simple consultation.",
              ['Identifiants directs et indirects', 'Données sensibles : régime renforcé', 'Consultation = traitement'],
            ),
            s(
              'Les grands principes',
              "Chaque traitement repose sur une base légale, poursuit une finalité déterminée et se limite aux données strictement nécessaires. La durée de conservation est définie à l'avance, pas au fil de l'eau.",
              ['Licité, loyauté, transparence', 'Minimisation des données', 'Limitation de la conservation'],
              'Collecter « au cas où » est la non-conformité la plus fréquemment constatée.',
            ),
            s(
              'Droits des personnes',
              "Accès, rectification, effacement, opposition et portabilité : la réponse est due dans un délai d'un mois. Une procédure interne doit exister avant la première demande, pas après.",
              ['Réponse sous un mois', 'Identité du demandeur vérifiée', 'Traçabilité des demandes'],
            ),
          ]),
          d('doc-cyb-202', 'Gestion d’un incident', 'Détection, qualification, notification et retour d’expérience.', [
            s(
              'Qualifier l’incident',
              "Toute violation de confidentialité, d'intégrité ou de disponibilité de données personnelles constitue une violation au sens du règlement, y compris la perte d'un téléphone non chiffré.",
              ['Confidentialité, intégrité, disponibilité', 'Registre des violations obligatoire', 'Évaluation du risque pour les personnes'],
            ),
            s(
              'Notifier dans les délais',
              "L'autorité de contrôle est notifiée sous soixante-douze heures lorsque la violation présente un risque. Les personnes concernées sont informées directement si le risque est élevé.",
              ['72 heures pour l’autorité', 'Information des personnes si risque élevé', 'Notification progressive acceptée'],
              'Le compte à rebours démarre à la prise de connaissance, pas à la fin de l’analyse.',
            ),
            s(
              'Retour d’expérience',
              "La clôture d'un incident inclut une analyse des causes racines et un plan d'action vérifiable. Sans REX, le même scénario se reproduit dans les douze mois.",
              ['Analyse des causes racines', 'Plan d’action avec échéances', 'Test de la mesure corrective'],
            ),
          ]),
        ],
      },
    ],
  },
  {
    id: 'f-manag',
    name: 'Management d’équipe agile',
    description: 'Animer une équipe produit : rituels, feedback, indicateurs et amélioration continue.',
    category: 'Management',
    icon: 'people',
    color: '#F59E0B',
    mandatory: false,
    levels: [
      {
        id: 'l-man-1',
        name: 'Niveau 1 — Rituels et posture',
        description: 'Cadencer le travail collectif et développer une posture de facilitateur.',
        documents: [
          d('doc-man-101', 'Les rituels d’équipe', 'Mêlée, revue, rétrospective : à quoi servent-ils vraiment ?', [
            s(
              'La mêlée quotidienne',
              "Quinze minutes debout, centrées sur l'objectif d'itération et les obstacles. Ce n'est pas un rapport d'activité au manager mais une synchronisation entre pairs.",
              ['15 minutes maximum', 'Focus sur les obstacles', 'Les détails techniques après la réunion'],
              'Si la mêlée dure trente minutes, c’est qu’elle sert de réunion de résolution : sortez le sujet.',
            ),
            s(
              'La revue d’itération',
              "On démontre un incrément fonctionnel, pas des diapositives. Le retour des parties prenantes alimente directement le carnet de produit et arbitre la suite.",
              ['Démonstration réelle', 'Parties prenantes présentes', 'Décisions tracées'],
            ),
            s(
              'La rétrospective',
              "Elle porte sur le système, pas sur les personnes. Une rétrospective sans action mesurable devient rapidement un rituel vide que l'équipe finit par subir.",
              ['Sécurité psychologique', 'Une à deux actions maximum', 'Suivi à la rétrospective suivante'],
            ),
          ]),
          d('doc-man-102', 'Feedback et entretiens', 'Donner un retour utile et conduire un entretien structuré.', [
            s(
              'Un feedback actionnable',
              "Le modèle situation-comportement-impact retire l'interprétation du message. On décrit un fait observable, son effet concret, puis on ouvre le dialogue.",
              ['Situation : quand et où', 'Comportement : fait observable', 'Impact : conséquence concrète'],
              'Un feedback différé de trois semaines a perdu l’essentiel de sa valeur.',
            ),
            s(
              'L’entretien individuel',
              "Rythme mensuel, ordre du jour partagé, majorité du temps de parole à la personne. C'est un espace de développement, distinct de l'évaluation annuelle.",
              ['Cadence régulière et tenue', '70 % de temps d’écoute', 'Notes et engagements partagés'],
            ),
            s(
              'Gérer un désaccord',
              "Le désaccord se traite tôt et en privé. Chercher l'intérêt derrière la position permet presque toujours de trouver une option acceptable pour les deux parties.",
              ['Traiter tôt, en privé', 'Chercher l’intérêt, pas la position', 'Formaliser l’accord obtenu'],
            ),
          ]),
        ],
      },
      {
        id: 'l-man-2',
        name: 'Niveau 2 — Pilotage',
        description: 'Mesurer sans surveiller et améliorer le flux de l’équipe.',
        documents: [
          d('doc-man-201', 'Piloter par les indicateurs', 'Choisir des métriques de flux qui servent l’équipe.', [
            s(
              'Mesurer le flux',
              "Délai de traitement, débit, travail en cours et taux d'échec de changement décrivent la santé d'un système de livraison bien mieux qu'un nombre d'heures passées.",
              ['Lead time et cycle time', 'Débit par itération', 'Travail en cours limité'],
              'Toute métrique utilisée comme objectif individuel cesse d’être une bonne métrique.',
            ),
            s(
              'Limiter le travail en cours',
              "Le multitâche dégrade le délai global. Réduire le nombre d'éléments ouverts simultanément augmente mécaniquement le débit et rend les blocages visibles immédiatement.",
              ['Limite explicite par colonne', 'Terminer avant de commencer', 'Les blocages deviennent visibles'],
            ),
            s(
              'Amélioration continue',
              "Une expérimentation par itération, mesurée sur deux cycles, suffit à progresser durablement. Multiplier les changements simultanés rend toute interprétation impossible.",
              ['Une expérimentation à la fois', 'Mesure sur deux itérations', 'Décision : garder, adapter, abandonner'],
            ),
          ]),
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Construction des entités plates + rendu des pages                    */
/* ------------------------------------------------------------------ */

function buildPages(doc: DocSeed, formationName: string, levelName: string): PdfPage[] {
  const pages: PdfPage[] = [];
  const push = (blocks: PdfBlock[]) =>
    pages.push({ documentId: doc.id, number: pages.length + 1, blocks });

  // Page de garde
  push([
    { type: 'p', text: formationName.toUpperCase() },
    { type: 'h1', text: doc.title },
    { type: 'divider' },
    { type: 'p', text: doc.description },
    { type: 'quote', text: `${levelName} — Support de formation interne` },
    { type: 'callout', text: 'Document confidentiel. Diffusion et reproduction interdites hors du cadre de la formation.' },
  ]);

  // Sommaire
  push([
    { type: 'h2', text: 'Sommaire' },
    { type: 'divider' },
    { type: 'bullets', items: doc.sections.map((sec, i) => `${i + 1}. ${sec.title}`) },
    { type: 'p', text: "Objectif pédagogique : à l'issue de ce module, vous serez capable d'appliquer les notions présentées dans votre activité quotidienne et de répondre au quiz de validation." },
  ]);

  doc.sections.forEach((sec, index) => {
    const blocks: PdfBlock[] = [
      { type: 'p', text: `Chapitre ${index + 1}` },
      { type: 'h2', text: sec.title },
      { type: 'divider' },
      { type: 'p', text: sec.body },
      { type: 'bullets', items: sec.bullets },
    ];
    if (sec.tip) blocks.push({ type: 'callout', text: sec.tip });
    if (sec.quote) blocks.push({ type: 'quote', text: sec.quote });
    push(blocks);
  });

  // Synthèse
  push([
    { type: 'h2', text: 'À retenir' },
    { type: 'divider' },
    { type: 'bullets', items: doc.sections.map((sec) => sec.bullets[0]) },
    { type: 'callout', text: 'Vous avez terminé ce document. Votre progression a été enregistrée automatiquement.' },
  ]);

  return pages;
}

export interface CatalogDb {
  formations: Formation[];
  levels: Level[];
  documents: TrainingDocument[];
  pages: Record<string, PdfPage[]>;
}

let cache: CatalogDb | null = null;

export function catalogDb(): CatalogDb {
  if (cache) return cache;

  const formations: Formation[] = [];
  const levels: Level[] = [];
  const documents: TrainingDocument[] = [];
  const pages: Record<string, PdfPage[]> = {};

  SEED.forEach((f) => {
    let fDocs = 0;
    let fPages = 0;

    f.levels.forEach((l, li) => {
      let lPages = 0;
      l.documents.forEach((doc, di) => {
        const rendered = buildPages(doc, f.name, l.name);
        pages[doc.id] = rendered;
        lPages += rendered.length;
        documents.push({
          id: doc.id,
          levelId: l.id,
          formationId: f.id,
          order: di + 1,
          title: doc.title,
          description: doc.description,
          pageCount: rendered.length,
          sizeKb: 180 + rendered.length * 47,
          updatedAt: new Date(2024, (di + li) % 12, ((di * 7 + li * 3) % 27) + 1).toISOString(),
        });
      });
      fDocs += l.documents.length;
      fPages += lPages;
      levels.push({
        id: l.id,
        formationId: f.id,
        order: li + 1,
        name: l.name,
        description: l.description,
        documentsCount: l.documents.length,
        totalPages: lPages,
      });
    });

    formations.push({
      id: f.id,
      name: f.name,
      description: f.description,
      category: f.category,
      icon: f.icon,
      color: f.color,
      levelsCount: f.levels.length,
      documentsCount: fDocs,
      totalPages: fPages,
      durationMinutes: fPages * 3,
      mandatory: f.mandatory,
    });
  });

  cache = { formations, levels, documents, pages };
  return cache;
}

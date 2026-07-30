## 2025-02-18 - [Améliorations de l'accessibilité et micro-UX]
**Learning:**
1. Pour garder le texte du label et les astérisques obligatoires proches l'un de l'autre malgré les propriétés d'alignement CSS du parent (par exemple, si un flex container ou d'autres styles modifient l'alignement), l'utilisation d'un conteneur flex imbriqué comme `span className="flex items-center gap-1"` est idéale.
2. L'indicateur d'état actif sur un menu de navigation latéral doit utiliser l'attribut `aria-current="page"` pour informer clairement les technologies d'assistance, et les icônes imbriquées décoratives doivent utiliser `aria-hidden="true"` pour éviter de polluer la lecture d'écran.
3. Les composants d'alertes dynamiques ou de notification temporaires (toast) nécessitent le rôle `role="alert"` pour forcer les lecteurs d'écran à annoncer immédiatement le texte du message.
4. Les indicateurs d'état à double sens (ex: connexion API en ligne / hors ligne) bénéficient d'une double déclaration via `title` pour les utilisateurs voyants (info-bulle) et `aria-label` pour les lecteurs d'écran.

**Action:** Toujours appliquer ces structures d'accessibilité ARIA standards et de micro-UX de manière systématique sur les formulaires et éléments de navigation.

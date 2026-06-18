# Debug Session: ios-rewarded-no-fill
- **Status**: [OPEN]
- **Issue**: Les pubs rewarded ne s'affichent pas sur iPhone, y compris avec la build preview utilisant les TestIds AdMob.
- **Debug Server**: http://172.20.10.2:7777/event
- **Log File**: .dbg/trae-debug-log-ios-rewarded-no-fill.ndjson

## Reproduction Steps
1. Installer la build iOS preview sur un iPhone enregistre.
2. Ouvrir l'app et se connecter.
3. Aller sur un ecran qui declenche une rewarded.
4. Taper sur "Regarder une video".
5. Observer le popup "Pub indisponible".

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | La rewarded n'atteint jamais l'etat `LOADED` sur iOS et expire au timeout de 12s. | High | Low | Pending |
| B | Le flux ATT est considere pret, mais les requetes pub sont envoyees avec un etat iOS invalide ou incomplet. | Medium | Low | Pending |
| C | Le SDK iOS remonte une erreur `AdEventType.ERROR` lors du `load()` ou du `show()`, masquee par le message generique. | High | Low | Pending |
| D | La build preview n'utilise pas reellement les TestIds au runtime iPhone. | Medium | Low | Pending |
| E | Le bouton rewarded est declenche avant que l'instance rewarded soit correctement preparee. | Medium | Low | Pending |

## Log Evidence
- Debug server running on `http://172.20.10.2:7777`
- Instrumentation added in `src/ads/AdSystem.js` for rewarded entry, instance creation, load success, SDK error, and timeout
- `GET /health` returned `log_count: 0` after reproduction
- `.dbg/trae-debug-log-ios-rewarded-no-fill.ndjson` was not created, so no runtime events reached the server from the iPhone

## Verification Conclusion
- Evidence collection blocked: no runtime logs reached the debug server, so hypotheses A-E remain unverified.
- Most likely cause of missing evidence: the iPhone did not have network access to `172.20.10.2:7777` during the test (device was likely on cellular or a different network).

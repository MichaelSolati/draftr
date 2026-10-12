import {draftrPrismLanguage, draftrSyntaxPrismLanguage} from '@draftr/theme';
import {Prism} from 'prism-react-renderer';

(Prism as any).languages.draftr = draftrPrismLanguage;
(Prism as any).languages.draftrDSL = draftrPrismLanguage;
(Prism as any).languages['draftr-syntax'] = draftrSyntaxPrismLanguage;

export type Visibility = 'public' | 'private' | 'protected';

export interface MethodParameter {
  name: string;
  type: string;
}

export interface MethodCall {
  targetClass: string;
  targetMethod: string;
}

export interface MethodSignature {
  name: string;
  visibility: Visibility;
  parameters: MethodParameter[];
  returnType: string;
  calls?: MethodCall[];
}

export interface PropertyDefinition {
  name: string;
  visibility: Visibility;
  type: string;
}

export interface ClassSpec {
  id: string;
  name: string;
  kind: 'class' | 'type' | 'interface';
  properties: PropertyDefinition[];
  methods: MethodSignature[];
  position?: {x: number; y: number};
}

export interface UIComponentSpec {
  id: string;
  name: string;
  parentId?: string;
  children: string[];
  boundLogicEntities: string[];
  position?: {x: number; y: number};
}

export interface ConnectionEdge {
  id: string;
  sourceId: string;
  sourceMember?: string;
  targetId: string;
  targetMember?: string;
  type: 'invokes' | 'binds' | 'inherits';
}

export interface ParserDiagnostic {
  line: number;
  message: string;
  severity: 'warning' | 'error' | 'info';
}

export interface ArchitectureProject {
  id: string;
  name: string;
  rawOutlineText: string;
  classes: ClassSpec[];
  uiComponents: UIComponentSpec[];
  connections: ConnectionEdge[];
  updatedAt: number;
  createdAt: number;
}

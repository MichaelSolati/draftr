---
id: grammar
title: Formal grammar reference
sidebar_position: 1
---

# Formal grammar reference

This page defines the formal Extended Backus-Naur Form (EBNF) grammar for Draftr (`.draftr`).

## EBNF grammar specification

```ebnf
Spec             ::= ( Entity | Comment | BlankLine )* ;

Entity           ::= ClassDecl
                   | AbstractClassDecl
                   | InterfaceDecl
                   | TypeDecl
                   | TableDecl
                   | ApiRouteDecl
                   | UiComponentDecl
                   | EventDecl
                   | StateDecl
                   | FunctionDecl ;

ClassDecl        ::= "class" Identifier [ "extends" Identifier ] [ "implements" IdentifierList ] Newline MemberList ;
AbstractClassDecl::= "abstract" "class" Identifier [ "extends" Identifier ] [ "implements" IdentifierList ] Newline MemberList ;
InterfaceDecl    ::= "interface" Identifier [ "extends" Identifier ] Newline InterfaceMemberList ;
TypeDecl         ::= "type" Identifier Newline PropertyList ;
TableDecl        ::= "db" Identifier Newline ColumnList ;
ApiRouteDecl     ::= "api" Path Newline EndpointList ;
UiComponentDecl  ::= "ui" Identifier Newline UiMemberList ;
EventDecl        ::= "event" Identifier [ "(" Type ")" ] Newline ;
StateDecl        ::= "state" Identifier Newline StateMemberList ;
FunctionDecl     ::= [ Visibility ] "function" Identifier "(" [ ParamList ] ")" [ ":" Type ] Newline [ InvocationList ] ;

Member           ::= [ Visibility ] [ Modifier ] Identifier [ "?" ] [ "(" [ ParamList ] ")" ] [ ":" Type ] Newline [ InvocationList ] ;

Invocation       ::= Indent4 Verb Target [ "(" [ Payload ] ")" ] Newline ;
Verb             ::= "call" | "emit" | "dispatch" | "query" | "mutate" | "render" ;

Visibility       ::= "public" | "private" | "protected" | "readonly" ;
Modifier         ::= "get" | "set" | "static" | "async" | "action" | "prop" | "emit" | "param" | "return" ;
ColumnConstraint ::= "pk" | "fk" | "unique" | "nullable" | "index" | "default" ;

Type             ::= SimpleType ( "|" SimpleType )* ;
SimpleType       ::= Identifier [ "?" ] [ "[]" ] ;
Target           ::= Identifier [ "." Identifier ] ;
```

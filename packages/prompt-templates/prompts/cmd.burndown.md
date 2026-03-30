burndown flow

REVIEW: dispatch async oracle to do ULTRACRITICAL review with skill:professional-rust-review, 30. and 40 - to specifically review the changes since the last review (if no previous review, your commit)

1. do <ticket>
   1a. commit
   1b. dispatch <REVIEW>
2. do next <ticket>
   2X. when review comes in- do 100%, 10/10 of the fixes -> dispatch <REVIEW>
   2a. commit
   2b. dispatch <REVIEW>

3. BIFURCATE
   ┬Is review NOT 10/10?
   └─ fix first + dispatch new async oracle to do ULTRACRITICAL review with skill:professional-rust-review, 30. and 40. -> review comes back? GOTO 3.
   ┬Is review 10/10, ZERO comments?
   └─- GOTO 1.

GUARD PROTOCOL, only pass if 10/10 and no comments- exceptions need to be approved by the Hooman with [FUCK].

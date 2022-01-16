import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { RatioFinal } from '../target/types/ratio_final';
import * as spl from '@solana/spl-token';
import * as assert from 'assert';



describe('ratioFinal', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  //program which isused throughout our tests
  const program = anchor.workspace.Ratio as Program<RatioFinal>;

  let userAccount: anchor.web3.Keypair;
  let testUserTokenAccount: anchor.web3.PublicKey;
  let tokenMint: spl.Token;

  before(async () => {

    //system wallet with key wallet.publicKey.toBase58()
    const wallet = program.provider.wallet;

    userAccount = anchor.web3.Keypair.generate();
    var fromAirDropSignature = await program.provider.connection.requestAirdrop(userAccount.publicKey,1000000000)
    await program.provider.connection.confirmTransaction(fromAirDropSignature);

    //account of mint for our new token
    tokenMint = await spl.Token.createMint(program.provider.connection,
      userAccount, //payer
      userAccount.publicKey, //mint auth
      null, //freeze auth
      0, //decimals
      spl.TOKEN_PROGRAM_ID); //programID for spl token program, which is a universal contract

    //create account for our user to hold their tokens in
    testUserTokenAccount = await tokenMint.createAssociatedTokenAccount(
      userAccount.publicKey
    )
    
    //mint 100 test tokens in our test users token account
    await tokenMint.mintTo(testUserTokenAccount, userAccount.publicKey, [], 100);
  })

  it('It deposits, withdraws, and airdrops!', async () => {
    let [pdaTokenAAddress, pdaTokenABump] = await anchor.web3.PublicKey.findProgramAddress([tokenMint.publicKey.toBuffer()], program.programId)

    let amountInVault: number;
    let amountInWallet: number;

    //deposit 10 spl tokens into our vault which holds our tokens
    const tx = await program.rpc.deposit(pdaTokenABump, new anchor.BN(10),
      {
        accounts: {
          vaultAccount: pdaTokenAAddress,
          payer: userAccount.publicKey,
          payerTokenAccount:testUserTokenAccount,
          mint: tokenMint.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
      signers: [userAccount]
    });
    
    //get the current balance of our vault and user
    amountInVault = (await tokenMint.getAccountInfo(pdaTokenAAddress)).amount.toNumber();
    amountInWallet = (await tokenMint.getAccountInfo(testUserTokenAccount)).amount.toNumber();
  
    assert.equal(amountInVault, 10);
    assert.equal(amountInWallet, 90);
    console.log("Deposit Executed Successfully");
    
    //withdraw 5 spl tokens from our vault into our user account
    const tx2 = await program.rpc.withdraw(pdaTokenABump, new anchor.BN(5),{
      accounts: {
        vaultAccount: pdaTokenAAddress,
        payer: userAccount.publicKey,
        payerTokenAccount:testUserTokenAccount,
        mint: tokenMint.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      },
      signers: [userAccount]
    });

    amountInVault = (await tokenMint.getAccountInfo(pdaTokenAAddress)).amount.toNumber();
    amountInWallet = (await tokenMint.getAccountInfo(testUserTokenAccount)).amount.toNumber();
  
    assert.equal(amountInVault, 5);
    assert.equal(amountInWallet, 95);
    console.log("Withdraw Executed Successfully");
  
    //airdrop 10 spl tokens directly into our vault
    const tx3 =  await program.rpc.airdrop(
      new anchor.BN(10),
      {
        accounts: {
          payer: userAccount.publicKey,
          mint: tokenMint.publicKey,
          destination: pdaTokenAAddress,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        },
        signers: [userAccount],
      }
    );
  
    amountInVault = (await tokenMint.getAccountInfo(pdaTokenAAddress)).amount.toNumber();
    amountInWallet = (await tokenMint.getAccountInfo(testUserTokenAccount)).amount.toNumber();
  
    assert.equal(amountInVault, 15);
    assert.equal(amountInWallet, 95);
    console.log("Airdrop Executed Successfully");

    console.log("Your transaction signature", tx);
  });
});

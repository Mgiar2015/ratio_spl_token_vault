use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

declare_id!("EUAi4FePMFtT5QCxyRCJjPiHZCZQPjkQ7xZzCacMNfvc");

#[program]
pub mod ratio {
    use super::*;
    pub fn deposit(ctx: Context<Deposit>, _bump: u8, amount: u64) -> ProgramResult {
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx
                        .accounts
                        .payer_token_account
                        .to_account_info(),
                    to: ctx
                        .accounts
                        .vault_account
                        .to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )
    }

    pub fn withdraw(ctx: Context<Withdraw>, bump: u8, amount: u64) -> ProgramResult {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx
                        .accounts
                        .vault_account
                        .to_account_info(),
                    to: ctx
                        .accounts
                        .payer_token_account
                        .to_account_info(),
                    authority: ctx.accounts.vault_account.to_account_info(),
                },
                &[&[
                    ctx.accounts.mint.key().as_ref(),
                    &[bump],
                ]],
            ),
            amount,
        )
    }

    pub fn airdrop(ctx: Context<Airdrop>, amount: u64) -> ProgramResult {
        anchor_spl::token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                }
            ),
            amount,
        )
    }

}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Deposit<'info> {
    #[account(init_if_needed,
        payer = payer,
        seeds = [mint.key().as_ref()],
        bump = bump,
        token::mint = mint,
        token::authority = vault_account)]
    pub vault_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub payer_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub payer_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Airdrop<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}
